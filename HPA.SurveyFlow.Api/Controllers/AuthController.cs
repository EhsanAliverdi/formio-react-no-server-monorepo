using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, AuthService authService, AuditService auditService) : ControllerBase
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
        await auditService.LogAsync(
            user.Id,
            user.Email,
            "login",
            "User",
            user.Id.ToString(),
            user.DisplayName ?? user.Email,
            ClientIp());

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
            {
                var user = await authService.GetUserFromTokenAsync(token);
                await authService.DeleteSessionByTokenAsync(token);
                if (user != null)
                {
                    await auditService.LogAsync(
                        user.Id,
                        user.Email,
                        "logout",
                        "User",
                        user.Id.ToString(),
                        user.DisplayName ?? user.Email,
                        ClientIp());
                }
            }
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

    private string? ClientIp() => HttpContext.Connection.RemoteIpAddress?.ToString();
}
