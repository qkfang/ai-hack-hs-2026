import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

export interface CodeFile {
  filename: string;
  content: string;
}

export interface CodeBundle {
  files: Record<string, string>;
  entrypoint: string;
  version: number;
  updatedAt: string;
}

export interface UserData {
  id: string;
  name: string;
  createdAt: string;
  ideaId?: string;
  ideaTitle?: string;
}

export interface StorageProvider {
  getUser(userId: string): Promise<UserData | null>;
  createUser(name: string, userId?: string): Promise<UserData>;
  updateUser(userId: string, updates: Partial<UserData>): Promise<UserData>;
  listUsers(): Promise<UserData[]>;
  getCodeBundle(userId: string): Promise<CodeBundle | null>;
  saveCodeBundle(userId: string, bundle: CodeBundle): Promise<void>;
  deleteCodeBundle(userId: string): Promise<void>;
  getDefaultTemplate(): Promise<CodeBundle>;
}

export class FileSystemStorageProvider implements StorageProvider {
  private baseDir: string;
  private templateDir: string;
  private usersFile: string;

  constructor(sampleName?: string) {
    const activeSample = sampleName || process.env.SAMPLE_NAME || "idea-spark-app";
    this.baseDir = path.join(process.cwd(), ".user-data");
    this.templateDir = path.join(process.cwd(), "samples", activeSample, "template");
    this.usersFile = path.join(this.baseDir, "users.json");
  }

  private async ensureDir(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch {
      // Directory might already exist
    }
  }

  private async readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  private async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    await this.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  private getUserDir(userId: string): string {
    return path.join(this.baseDir, userId);
  }

  async getUser(userId: string): Promise<UserData | null> {
    const users = await this.readJsonFile<UserData[]>(this.usersFile);
    return users?.find((u) => u.id === userId) || null;
  }

  async createUser(name: string, userId?: string): Promise<UserData> {
    const users = (await this.readJsonFile<UserData[]>(this.usersFile)) || [];
    const newUser: UserData = {
      id: userId || randomUUID(),
      name,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    await this.writeJsonFile(this.usersFile, users);
    await this.ensureDir(this.getUserDir(newUser.id));
    return newUser;
  }

  async updateUser(userId: string, updates: Partial<UserData>): Promise<UserData> {
    const users = (await this.readJsonFile<UserData[]>(this.usersFile)) || [];
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error(`User ${userId} not found`);
    users[userIndex] = { ...users[userIndex], ...updates, id: userId };
    await this.writeJsonFile(this.usersFile, users);
    return users[userIndex];
  }

  async listUsers(): Promise<UserData[]> {
    return (await this.readJsonFile<UserData[]>(this.usersFile)) || [];
  }

  async getCodeBundle(userId: string): Promise<CodeBundle | null> {
    const userDir = this.getUserDir(userId);
    const bundlePath = path.join(userDir, "bundle.json");
    const filesDir = path.join(userDir, "files");

    const bundleMeta = await this.readJsonFile<{
      entrypoint: string;
      version: number;
      updatedAt: string;
      files: string[];
    }>(bundlePath);

    if (!bundleMeta) return null;

    const files: Record<string, string> = {};
    for (const filename of bundleMeta.files) {
      try {
        const filePath = path.join(filesDir, filename);
        files[filename] = await fs.readFile(filePath, "utf-8");
      } catch {
        // skip missing files
      }
    }

    return {
      files,
      entrypoint: bundleMeta.entrypoint,
      version: bundleMeta.version,
      updatedAt: bundleMeta.updatedAt,
    };
  }

  async saveCodeBundle(userId: string, bundle: CodeBundle): Promise<void> {
    const userDir = this.getUserDir(userId);
    const bundlePath = path.join(userDir, "bundle.json");
    const filesDir = path.join(userDir, "files");

    await this.ensureDir(filesDir);

    for (const [filename, content] of Object.entries(bundle.files)) {
      const filePath = path.join(filesDir, filename);
      await this.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content, "utf-8");
    }

    await this.writeJsonFile(bundlePath, {
      entrypoint: bundle.entrypoint,
      version: bundle.version,
      updatedAt: bundle.updatedAt,
      files: Object.keys(bundle.files),
    });
  }

  async deleteCodeBundle(userId: string): Promise<void> {
    const userDir = this.getUserDir(userId);
    const filesDir = path.join(userDir, "files");
    try {
      await fs.rm(filesDir, { recursive: true, force: true });
      await fs.unlink(path.join(userDir, "bundle.json"));
    } catch {
      // Files might not exist
    }
  }

  async getDefaultTemplate(): Promise<CodeBundle> {
    try {
      const manifestPath = path.join(this.templateDir, "manifest.json");
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as {
        name: string;
        version: string;
        description: string;
        entrypoint: string;
        files: string[];
      };

      const files: Record<string, string> = {};
      for (const filename of manifest.files) {
        const filePath = path.join(this.templateDir, filename);
        files[filename] = await fs.readFile(filePath, "utf-8");
      }

      return {
        files,
        entrypoint: manifest.entrypoint,
        version: 0,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to load default template:", error);
      return {
        files: {
          "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Page</title>
</head>
<body>
  <h1>Welcome</h1>
  <p>Start chatting with Copilot to build your page!</p>
</body>
</html>`,
        },
        entrypoint: "index.html",
        version: 0,
        updatedAt: new Date().toISOString(),
      };
    }
  }
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

export class BlobStorageProvider implements StorageProvider {
  private containerClient: ContainerClient;
  private templateDir: string;

  constructor(accountName: string, containerName = "webbuilder", sampleName?: string) {
    const activeSample = sampleName || process.env.SAMPLE_NAME || "idea-spark-app";
    this.templateDir = path.join(process.cwd(), "samples", activeSample, "template");
    const blobServiceClient = new BlobServiceClient(
      `https://${accountName}.blob.core.windows.net`,
      new DefaultAzureCredential()
    );
    this.containerClient = blobServiceClient.getContainerClient(containerName);
  }

  private async ensureContainer(): Promise<void> {
    try {
      await this.containerClient.createIfNotExists();
    } catch (error) {
      console.error("Failed to ensure blob container exists:", error);
      throw error;
    }
  }

  private async readBlob<T>(blobPath: string): Promise<T | null> {
    try {
      const blobClient = this.containerClient.getBlobClient(blobPath);
      const response = await blobClient.download();
      if (!response.readableStreamBody) return null;
      const content = await streamToString(response.readableStreamBody);
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  private async writeBlob<T>(blobPath: string, data: T): Promise<void> {
    await this.ensureContainer();
    const content = JSON.stringify(data, null, 2);
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);
    await blockBlobClient.upload(content, Buffer.byteLength(content), {
      blobHTTPHeaders: { blobContentType: "application/json" },
    });
  }

  private async writeBlobText(blobPath: string, content: string, contentType = "text/plain"): Promise<void> {
    await this.ensureContainer();
    const blockBlobClient = this.containerClient.getBlockBlobClient(blobPath);
    await blockBlobClient.upload(content, Buffer.byteLength(content), {
      blobHTTPHeaders: { blobContentType: contentType },
    });
  }

  private async readBlobText(blobPath: string): Promise<string | null> {
    try {
      const blobClient = this.containerClient.getBlobClient(blobPath);
      const response = await blobClient.download();
      if (!response.readableStreamBody) return null;
      return await streamToString(response.readableStreamBody);
    } catch {
      return null;
    }
  }

  async getUser(userId: string): Promise<UserData | null> {
    const users = await this.readBlob<UserData[]>("meta/users.json");
    return users?.find((u) => u.id === userId) || null;
  }

  async createUser(name: string, userId?: string): Promise<UserData> {
    const users = (await this.readBlob<UserData[]>("meta/users.json")) || [];
    const newUser: UserData = {
      id: userId!,
      name,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    await this.writeBlob("meta/users.json", users);
    return newUser;
  }

  async updateUser(userId: string, updates: Partial<UserData>): Promise<UserData> {
    const users = (await this.readBlob<UserData[]>("meta/users.json")) || [];
    const userIndex = users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error(`User ${userId} not found`);
    users[userIndex] = { ...users[userIndex], ...updates, id: userId };
    await this.writeBlob("meta/users.json", users);
    return users[userIndex];
  }

  async listUsers(): Promise<UserData[]> {
    return (await this.readBlob<UserData[]>("meta/users.json")) || [];
  }

  async getCodeBundle(userId: string): Promise<CodeBundle | null> {
    const bundleMeta = await this.readBlob<{
      entrypoint: string;
      version: number;
      updatedAt: string;
      files: string[];
    }>(`${userId}/bundle.json`);

    if (!bundleMeta) return null;

    const files: Record<string, string> = {};
    for (const filename of bundleMeta.files) {
      const content = await this.readBlobText(`${userId}/files/${filename}`);
      if (content !== null) files[filename] = content;
    }

    return {
      files,
      entrypoint: bundleMeta.entrypoint,
      version: bundleMeta.version,
      updatedAt: bundleMeta.updatedAt,
    };
  }

  async saveCodeBundle(userId: string, bundle: CodeBundle): Promise<void> {
    await this.ensureContainer();
    const contentTypeMap: Record<string, string> = {
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      ts: "application/typescript",
    };
    for (const [filename, content] of Object.entries(bundle.files)) {
      const ext = filename.split(".").pop()?.toLowerCase() || "";
      const contentType = contentTypeMap[ext] || "text/plain";
      await this.writeBlobText(`${userId}/files/${filename}`, content, contentType);
    }
    await this.writeBlob(`${userId}/bundle.json`, {
      entrypoint: bundle.entrypoint,
      version: bundle.version,
      updatedAt: bundle.updatedAt,
      files: Object.keys(bundle.files),
    });
  }

  async deleteCodeBundle(userId: string): Promise<void> {
    try {
      const bundleMeta = await this.readBlob<{ files: string[] }>(`${userId}/bundle.json`);
      if (bundleMeta) {
        for (const filename of bundleMeta.files) {
          try {
            await this.containerClient.getBlockBlobClient(`${userId}/files/${filename}`).delete();
          } catch (error) {
            console.warn("Failed to delete blob for user:", userId, "file:", filename, error);
          }
        }
        await this.containerClient.getBlockBlobClient(`${userId}/bundle.json`).delete();
      }
    } catch (error) {
      console.warn("Failed to delete code bundle for user:", userId, error);
    }
  }

  async getDefaultTemplate(): Promise<CodeBundle> {
    try {
      const manifestPath = path.join(this.templateDir, "manifest.json");
      const manifestContent = await fs.readFile(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestContent) as {
        name: string;
        version: string;
        description: string;
        entrypoint: string;
        files: string[];
      };

      const files: Record<string, string> = {};
      for (const filename of manifest.files) {
        const filePath = path.join(this.templateDir, filename);
        files[filename] = await fs.readFile(filePath, "utf-8");
      }

      return {
        files,
        entrypoint: manifest.entrypoint,
        version: 0,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to load default template:", error);
      return {
        files: {
          "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Page</title>
</head>
<body>
  <h1>Welcome</h1>
  <p>Start chatting with Copilot to build your page!</p>
</body>
</html>`,
        },
        entrypoint: "index.html",
        version: 0,
        updatedAt: new Date().toISOString(),
      };
    }
  }
}

function createStorage(): StorageProvider {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  if (accountName && accountName.trim().length > 0) {
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || "webbuilder";
    return new BlobStorageProvider(accountName, containerName);
  }
  return new FileSystemStorageProvider();
}

export const storage = createStorage();
