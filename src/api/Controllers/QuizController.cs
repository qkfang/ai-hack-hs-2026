using Microsoft.AspNetCore.Mvc;
using api.Services;

namespace api.Controllers;

[ApiController]
[Route("api/quiz")]
public class QuizController(QuizStore quiz, UserStore users) : ControllerBase
{
    private const string AdminPassword = "9999";

    [HttpGet("state")]
    public IActionResult GetState([FromQuery] int? userId)
    {
        var q = quiz.CurrentQuestion;
        var status = quiz.Status;
        var question = status == QuizStore.QuizStatus.InProgress
            ? new
            {
                text = QuizStore.Questions[q].Text,
                options = QuizStore.Questions[q].Options,
            }
            : (object?)null;

        return Ok(new
        {
            status = status.ToString().ToLower(),
            currentQuestion = q,
            totalQuestions = QuizStore.Questions.Length,
            question,
            hasAnswered = userId.HasValue && quiz.HasAnswered(userId.Value, q),
        });
    }

    [HttpPost("answer")]
    public IActionResult SubmitAnswer([FromBody] AnswerRequest req)
    {
        if (quiz.Status != QuizStore.QuizStatus.InProgress)
            return BadRequest(new { error = "Quiz is not in progress" });

        var q = quiz.CurrentQuestion;
        if (!quiz.SubmitAnswer(req.UserId, q, req.Answer))
            return BadRequest(new { error = "Already answered this question" });

        bool correct = req.Answer == QuizStore.Questions[q].CorrectIndex;
        return Ok(new { correct });
    }

    [HttpGet("leaderboard")]
    public IActionResult GetLeaderboard()
    {
        var allUsers = users.GetUsers();
        var board = allUsers
            .Select(u => new { userId = u.Id, username = u.Username, score = quiz.GetScore(u.Id) })
            .OrderByDescending(x => x.score)
            .ToList();
        return Ok(board);
    }

    [HttpPost("admin/control")]
    public IActionResult AdminControl([FromBody] AdminControlRequest req, [FromHeader(Name = "X-Admin-Password")] string? password)
    {
        if (password != AdminPassword)
            return Unauthorized(new { error = "Invalid admin password" });

        switch (req.Action)
        {
            case "start": quiz.Start(); break;
            case "next": quiz.Next(); break;
            case "prev": quiz.Prev(); break;
            case "finish": quiz.Finish(); break;
            case "reset": quiz.Reset(); break;
            default: return BadRequest(new { error = "Unknown action" });
        }

        return Ok(new { status = quiz.Status.ToString().ToLower(), currentQuestion = quiz.CurrentQuestion });
    }
}

public record AnswerRequest(int UserId, int Answer);
public record AdminControlRequest(string Action);
