using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SurveyFlow.Api.Extensions;
using SurveyFlow.Core.DTOs.Requests;
using SurveyFlow.Core.DTOs.Responses;
using SurveyFlow.Core.Entities;
using SurveyFlow.Core.Enums;
using SurveyFlow.Infrastructure.Data;
using SurveyFlow.Infrastructure.Services;

namespace SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/users")]
public class UsersController(AppDbContext db, AuthService authService, StorageService storageService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> ListUsers(
        [FromQuery] string? search,
        [FromQuery] string? active,
        [FromQuery] string? roles,
        [FromQuery] int limit = 200)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        limit = Math.Clamp(limit, 1, 200);

        var query = db.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLower();
            query = query.Where(u =>
                u.Email.ToLower().Contains(s) ||
                (u.DisplayName != null && u.DisplayName.ToLower().Contains(s)) ||
                (u.FirstName != null && u.FirstName.ToLower().Contains(s)) ||
                (u.LastName != null && u.LastName.ToLower().Contains(s)));
        }

        if (active == "1")
            query = query.Where(u => u.IsActive);

        if (!string.IsNullOrWhiteSpace(roles))
        {
            var roleList = roles.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            query = query.Where(u => roleList.Contains(u.Role));
        }

        var users = await query.OrderBy(u => u.Id).Take(limit).ToListAsync();
        return Ok(users.Select(ToDto).ToList());
    }

    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserRequest body)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        if (string.IsNullOrWhiteSpace(body.Email))
            return BadRequest(new { error = "Email is required." });
        if (string.IsNullOrWhiteSpace(body.Password))
            return BadRequest(new { error = "Password is required." });

        var existing = await db.Users.AnyAsync(u => u.Email == body.Email);
        if (existing)
            return Conflict(new { error = "A user with this email already exists." });

        var user = new User
        {
            Email = body.Email,
            PasswordHash = authService.HashPassword(body.Password),
            Role = body.Role ?? UserRole.Viewer,
            IsActive = ParseBoolish(body.IsActive, true),
            DisplayName = body.DisplayName,
            PreferredName = body.PreferredName,
            FirstName = body.FirstName,
            MiddleName = body.MiddleName,
            LastName = body.LastName,
            Pronouns = body.Pronouns,
            DateOfBirth = body.DateOfBirth,
            Phone = body.Phone,
            JobTitle = body.JobTitle,
            Department = body.Department,
            Company = body.Company,
            WebsiteUrl = body.WebsiteUrl,
            Bio = body.Bio,
            AddressLine1 = body.AddressLine1,
            AddressLine2 = body.AddressLine2,
            City = body.City,
            State = body.State,
            PostalCode = body.PostalCode,
            Country = body.Country,
            Timezone = body.Timezone,
            Locale = body.Locale,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return Ok(new { success = true, id = user.Id });
    }

    // IMPORTANT: /me routes must come BEFORE /{id} to avoid "me" being parsed as an id
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        User currentUser;
        try { currentUser = HttpContext.RequireRole(UserRole.Admin, UserRole.Editor, UserRole.Viewer); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var user = await db.Users.FindAsync(currentUser.Id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        return Ok(ToDto(user));
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest body)
    {
        User currentUser;
        try { currentUser = HttpContext.RequireRole(UserRole.Admin, UserRole.Editor, UserRole.Viewer); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var user = await db.Users.FindAsync(currentUser.Id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        if (body.DisplayName != null) user.DisplayName = body.DisplayName;
        if (body.PreferredName != null) user.PreferredName = body.PreferredName;
        if (body.FirstName != null) user.FirstName = body.FirstName;
        if (body.MiddleName != null) user.MiddleName = body.MiddleName;
        if (body.LastName != null) user.LastName = body.LastName;
        if (body.Pronouns != null) user.Pronouns = body.Pronouns;
        if (body.DateOfBirth != null) user.DateOfBirth = body.DateOfBirth;
        if (body.Phone != null) user.Phone = body.Phone;
        if (body.JobTitle != null) user.JobTitle = body.JobTitle;
        if (body.Department != null) user.Department = body.Department;
        if (body.Company != null) user.Company = body.Company;
        if (body.WebsiteUrl != null) user.WebsiteUrl = body.WebsiteUrl;
        if (body.Bio != null) user.Bio = body.Bio;
        if (body.AddressLine1 != null) user.AddressLine1 = body.AddressLine1;
        if (body.AddressLine2 != null) user.AddressLine2 = body.AddressLine2;
        if (body.City != null) user.City = body.City;
        if (body.State != null) user.State = body.State;
        if (body.PostalCode != null) user.PostalCode = body.PostalCode;
        if (body.Country != null) user.Country = body.Country;
        if (body.Timezone != null) user.Timezone = body.Timezone;
        if (body.Locale != null) user.Locale = body.Locale;

        await db.SaveChangesAsync();
        return Ok(new { success = true, user = ToDto(user) });
    }

    [HttpPost("me/avatar")]
    public async Task<IActionResult> UploadMyAvatar()
    {
        User currentUser;
        try { currentUser = HttpContext.RequireRole(UserRole.Admin, UserRole.Editor, UserRole.Viewer); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var user = await db.Users.FindAsync(currentUser.Id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        return await HandleAvatarUpload(user);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetUser(int id)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var user = await db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        return Ok(ToDto(user));
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest body)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var user = await db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        if (body.Email != null)
        {
            var conflict = await db.Users.AnyAsync(u => u.Email == body.Email && u.Id != id);
            if (conflict)
                return Conflict(new { error = "A user with this email already exists." });
            user.Email = body.Email;
        }
        if (!string.IsNullOrWhiteSpace(body.Password))
            user.PasswordHash = authService.HashPassword(body.Password);
        if (body.Role != null) user.Role = body.Role;
        if (body.IsActive != null) user.IsActive = ParseBoolish(body.IsActive, user.IsActive);
        if (body.DisplayName != null) user.DisplayName = body.DisplayName;
        if (body.PreferredName != null) user.PreferredName = body.PreferredName;
        if (body.FirstName != null) user.FirstName = body.FirstName;
        if (body.MiddleName != null) user.MiddleName = body.MiddleName;
        if (body.LastName != null) user.LastName = body.LastName;
        if (body.Pronouns != null) user.Pronouns = body.Pronouns;
        if (body.DateOfBirth != null) user.DateOfBirth = body.DateOfBirth;
        if (body.Phone != null) user.Phone = body.Phone;
        if (body.JobTitle != null) user.JobTitle = body.JobTitle;
        if (body.Department != null) user.Department = body.Department;
        if (body.Company != null) user.Company = body.Company;
        if (body.WebsiteUrl != null) user.WebsiteUrl = body.WebsiteUrl;
        if (body.Bio != null) user.Bio = body.Bio;
        if (body.AddressLine1 != null) user.AddressLine1 = body.AddressLine1;
        if (body.AddressLine2 != null) user.AddressLine2 = body.AddressLine2;
        if (body.City != null) user.City = body.City;
        if (body.State != null) user.State = body.State;
        if (body.PostalCode != null) user.PostalCode = body.PostalCode;
        if (body.Country != null) user.Country = body.Country;
        if (body.Timezone != null) user.Timezone = body.Timezone;
        if (body.Locale != null) user.Locale = body.Locale;

        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        User currentUser;
        try { currentUser = HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        if (currentUser.Id == id)
            return BadRequest(new { error = "Cannot delete your own account." });

        var user = await db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return Ok(new { success = true });
    }

    [HttpPost("{id:int}/avatar")]
    public async Task<IActionResult> UploadUserAvatar(int id)
    {
        try { HttpContext.RequireRole(UserRole.Admin); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        var user = await db.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { error = "User not found." });

        return await HandleAvatarUpload(user);
    }

    private async Task<IActionResult> HandleAvatarUpload(User user)
    {
        if (!Request.HasFormContentType)
            return BadRequest(new { error = "Multipart form data is required." });

        var form = await Request.ReadFormAsync();
        var file = form.Files.FirstOrDefault();

        if (file == null)
            return BadRequest(new { error = "No file provided." });

        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return StatusCode(415, new { error = "Only image files are allowed." });

        const long maxBytes = 5L * 1024 * 1024;
        if (file.Length > maxBytes)
            return StatusCode(413, new { error = "File too large. Maximum 5MB." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();

        var key = StorageService.BuildUserAvatarKey(user.Id, file.FileName, file.ContentType);
        await storageService.UploadAsync(key, bytes, file.ContentType, "public, max-age=31536000, immutable");

        user.AvatarUrl = $"/api/uploads/{key}";
        await db.SaveChangesAsync();

        return Ok(new
        {
            success = true,
            user = ToDto(user),
            avatar_url = user.AvatarUrl,
            storage = "minio",
            key,
            size = file.Length,
            type = file.ContentType
        });
    }

    internal static UserDto ToDto(User u) => new()
    {
        Id = u.Id,
        Email = u.Email,
        Role = u.Role,
        IsActive = u.IsActive,
        CreatedAt = u.CreatedAt,
        DisplayName = u.DisplayName,
        PreferredName = u.PreferredName,
        FirstName = u.FirstName,
        MiddleName = u.MiddleName,
        LastName = u.LastName,
        Pronouns = u.Pronouns,
        DateOfBirth = u.DateOfBirth,
        Phone = u.Phone,
        JobTitle = u.JobTitle,
        Department = u.Department,
        Company = u.Company,
        WebsiteUrl = u.WebsiteUrl,
        Bio = u.Bio,
        AddressLine1 = u.AddressLine1,
        AddressLine2 = u.AddressLine2,
        City = u.City,
        State = u.State,
        PostalCode = u.PostalCode,
        Country = u.Country,
        Timezone = u.Timezone,
        Locale = u.Locale,
        AvatarUrl = u.AvatarUrl
    };

    private static bool ParseBoolish(object? value, bool defaultValue = false)
    {
        return value switch
        {
            bool b => b,
            int i => i != 0,
            System.Text.Json.JsonElement el when el.ValueKind == System.Text.Json.JsonValueKind.True => true,
            System.Text.Json.JsonElement el when el.ValueKind == System.Text.Json.JsonValueKind.False => false,
            System.Text.Json.JsonElement el when el.ValueKind == System.Text.Json.JsonValueKind.Number => el.GetInt32() != 0,
            string s => s == "1" || s.Equals("true", StringComparison.OrdinalIgnoreCase),
            _ => defaultValue
        };
    }
}
