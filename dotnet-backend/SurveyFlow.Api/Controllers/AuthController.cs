using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SurveyFlow.Api.Extensions;
using SurveyFlow.Core.DTOs.Requests;
using SurveyFlow.Core.DTOs.Responses;
using SurveyFlow.Core.Entities;
using SurveyFlow.Infrastructure.Data;
using SurveyFlow.Infrastructure.Services;

namespace SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, AuthService authService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest body)
    {
        if (string.IsNullOrWhiteSpace(body.Email) || string.IsNullOrWhiteSpace(body.Password))
            return BadRequest(new { error = "Email and password are required." });

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == body.Email);
        if (user == null || !authService.VerifyPassword(body.Password, user.PasswordHash))
            return Unauthorized(new { error = "Invalid email or password." });

        await authService.CleanExpiredSessionsAsync();
        var (token, expiresAt) = await authService.CreateSessionAsync(user.Id);

        return Ok(new
        {
            token,
            expiresAt = expiresAt.ToString("O"),
            user = ToAuthedUserDto(user)
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();
        if (authHeader != null && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var token = authHeader["Bearer ".Length..].Trim();
            if (!string.IsNullOrEmpty(token))
                await authService.DeleteSessionByTokenAsync(token);
        }
        return Ok(new { success = true });
    }

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        try { HttpContext.RequireUser(); }
        catch (UnauthorizedAccessException) { return Unauthorized(new { error = "Authentication required." }); }

        var currentUser = HttpContext.GetCurrentUser()!;
        var user = await db.Users.FindAsync(currentUser.Id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        return Ok(new { user = ToAuthedUserDto(user) });
    }

    private static AuthedUserDto ToAuthedUserDto(User u) => new()
    {
        Id = u.Id,
        Email = u.Email,
        Role = u.Role,
        DisplayName = u.DisplayName,
        PreferredName = u.PreferredName,
        FirstName = u.FirstName,
        LastName = u.LastName,
        AvatarUrl = u.AvatarUrl
    };
}
