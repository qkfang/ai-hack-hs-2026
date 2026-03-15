namespace api.Services;

public class QuizQuestion
{
    public string Text { get; set; } = "";
    public string[] Options { get; set; } = [];
    public int CorrectIndex { get; set; }
}

public class QuizStore
{
    public static readonly QuizQuestion[] Questions =
    [
        new QuizQuestion
        {
            Text = "What does AI stand for?",
            Options = ["Automated Intelligence", "Artificial Intelligence", "Advanced Integration", "Applied Information"],
            CorrectIndex = 1
        },
        new QuizQuestion
        {
            Text = "Which Microsoft AI assistant is built into Windows 11 and Microsoft 365?",
            Options = ["Siri", "Alexa", "Copilot", "Bixby"],
            CorrectIndex = 2
        },
        new QuizQuestion
        {
            Text = "What is a Large Language Model (LLM)?",
            Options = ["A very big dictionary", "An AI trained on text to understand and generate language", "A programming language for AI", "A type of database"],
            CorrectIndex = 1
        },
        new QuizQuestion
        {
            Text = "Which of the following is one of Microsoft's 6 Responsible AI principles?",
            Options = ["Speed", "Fairness", "Profitability", "Complexity"],
            CorrectIndex = 1
        },
        new QuizQuestion
        {
            Text = "What is 'prompt engineering'?",
            Options = ["Building hardware for AI chips", "Designing prompts to get better AI outputs", "Writing AI source code", "Training neural networks"],
            CorrectIndex = 1
        },
        new QuizQuestion
        {
            Text = "In Microsoft's Responsible AI framework, which principle means AI should not disadvantage people based on race, gender, or other factors?",
            Options = ["Reliability", "Privacy", "Fairness", "Accountability"],
            CorrectIndex = 2
        },
        new QuizQuestion
        {
            Text = "What is Azure AI Foundry?",
            Options = ["A cloud platform for building and deploying AI models and applications", "A robot manufacturing facility", "A Microsoft gaming service", "A programming language"],
            CorrectIndex = 0
        },
        new QuizQuestion
        {
            Text = "What does 'AI bias' mean?",
            Options = ["AI that prefers certain programming languages", "When AI produces unfair or skewed results due to flawed training data", "The speed difference between AI models", "AI that only works in one country"],
            CorrectIndex = 1
        },
        new QuizQuestion
        {
            Text = "Which Microsoft Responsible AI principle ensures humans remain in control of AI decisions?",
            Options = ["Transparency", "Human oversight and control (Accountability)", "Inclusiveness", "Reliability"],
            CorrectIndex = 1
        },
        new QuizQuestion
        {
            Text = "What is 'machine learning'?",
            Options = ["Teaching robots to walk", "A type of AI where systems learn patterns from data without being explicitly programmed", "Writing code that runs very fast", "A Microsoft Office feature"],
            CorrectIndex = 1
        },
    ];

    public enum QuizStatus { Waiting, InProgress, Finished }

    private readonly object _lock = new();
    private QuizStatus _status = QuizStatus.Waiting;
    private int _currentQuestion = 0;
    private readonly Dictionary<(int userId, int questionIndex), int> _answers = [];

    public QuizStatus Status { get { lock (_lock) return _status; } }
    public int CurrentQuestion { get { lock (_lock) return _currentQuestion; } }

    public void Start()
    {
        lock (_lock)
        {
            _status = QuizStatus.InProgress;
            _currentQuestion = 0;
        }
    }

    public void Next()
    {
        lock (_lock)
        {
            if (_status != QuizStatus.InProgress) return;
            if (_currentQuestion < Questions.Length - 1)
                _currentQuestion++;
        }
    }

    public void Prev()
    {
        lock (_lock)
        {
            if (_status != QuizStatus.InProgress) return;
            if (_currentQuestion > 0)
                _currentQuestion--;
        }
    }

    public void Finish()
    {
        lock (_lock) { _status = QuizStatus.Finished; }
    }

    public void Reset()
    {
        lock (_lock)
        {
            _status = QuizStatus.Waiting;
            _currentQuestion = 0;
            _answers.Clear();
        }
    }

    public bool SubmitAnswer(int userId, int questionIndex, int answerIndex)
    {
        lock (_lock)
        {
            if (_answers.ContainsKey((userId, questionIndex))) return false;
            _answers[(userId, questionIndex)] = answerIndex;
            return true;
        }
    }

    public bool? GetAnswer(int userId, int questionIndex)
    {
        lock (_lock)
        {
            if (!_answers.TryGetValue((userId, questionIndex), out var answer)) return null;
            return answer == Questions[questionIndex].CorrectIndex;
        }
    }

    public bool HasAnswered(int userId, int questionIndex)
    {
        lock (_lock) return _answers.ContainsKey((userId, questionIndex));
    }

    public int GetScore(int userId)
    {
        lock (_lock)
        {
            int score = 0;
            for (int i = 0; i < Questions.Length; i++)
            {
                if (_answers.TryGetValue((userId, i), out var answer) && answer == Questions[i].CorrectIndex)
                    score++;
            }
            return score;
        }
    }
}
