using System.IO.Compression;
using System.Text;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using Microsoft.AspNetCore.Mvc;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;

namespace api.Controllers;

[ApiController]
[Route("api/chat/upload")]
public class ChatUploadController : ControllerBase
{
    private static readonly string[] AllowedExtensions = [".pdf", ".docx"];
    private const int MaxFileSizeBytes = 10 * 1024 * 1024; // 10 MB

    [HttpPost]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> Upload(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No file provided." });

        if (file.Length > MaxFileSizeBytes)
            return BadRequest(new { error = "File exceeds the 10 MB limit." });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
            return BadRequest(new { error = "Only .pdf and .docx files are supported." });

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, cancellationToken);
        stream.Position = 0;

        var text = ext switch
        {
            ".pdf" => ExtractPdfText(stream),
            ".docx" => ExtractDocxText(stream),
            _ => throw new NotSupportedException()
        };

        return Ok(new { filename = file.FileName, text });
    }

    private static string ExtractPdfText(Stream stream)
    {
        var sb = new StringBuilder();
        using var doc = PdfDocument.Open(stream);
        foreach (var page in doc.GetPages())
            sb.AppendLine(ContentOrderTextExtractor.GetText(page));
        return sb.ToString();
    }

    private static string ExtractDocxText(Stream stream)
    {
        var sb = new StringBuilder();
        using var doc = WordprocessingDocument.Open(stream, false);
        var body = doc.MainDocumentPart?.Document?.Body;
        if (body is null) return string.Empty;
        foreach (var para in body.Descendants<Paragraph>())
            sb.AppendLine(para.InnerText);
        return sb.ToString();
    }
}
