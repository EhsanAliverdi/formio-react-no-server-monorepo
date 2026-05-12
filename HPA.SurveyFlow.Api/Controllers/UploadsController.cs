using Microsoft.AspNetCore.Mvc;
using HPA.SurveyFlow.Api.Extensions;
using HPA.SurveyFlow.Domain.Enums;
using HPA.SurveyFlow.Infrastructure.Services;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
public class UploadsController(StorageService storageService) : ControllerBase
{
    private static readonly HashSet<string> AllowedImageMimeTypes =
    [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "image/bmp",
        "image/tiff",
        "image/avif"
    ];

    [HttpPost("api/uploads")]
    public async Task<IActionResult> UploadFile()
    {
        try { HttpContext.RequireRole(UserRole.Admin, UserRole.Editor, UserRole.Viewer); }
        catch (UnauthorizedAccessException ex) { return Unauthorized(new { error = ex.Message }); }

        if (!Request.HasFormContentType)
            return BadRequest(new { error = "Multipart form data is required." });

        var form = await Request.ReadFormAsync();

        if (form.Files.Count == 0)
            return BadRequest(new { error = "At least one file is required." });

        var file = form.Files[0];

        if (!AllowedImageMimeTypes.Contains(file.ContentType.ToLower()))
            return StatusCode(415, new { error = "Only image files are allowed." });

        const long maxBytes = 10L * 1024 * 1024;
        if (file.Length > maxBytes)
            return StatusCode(413, new { error = "File too large. Maximum 10MB." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        var bytes = ms.ToArray();

        var key = StorageService.BuildImagesKey(file.FileName, file.ContentType);
        await storageService.UploadAsync(key, bytes, file.ContentType, "public, max-age=31536000, immutable");

        var url = $"/api/uploads/{key}";

        return Ok(new
        {
            url,
            storage = "minio",
            key,
            name = Path.GetFileName(key),
            originalName = file.FileName,
            size = file.Length,
            type = file.ContentType
        });
    }

    [HttpGet("api/uploads/{*key}")]
    public async Task<IActionResult> DownloadFile(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return NotFound(new { error = "Key is required." });

        var downloaded = await storageService.DownloadAsync(key);
        if (downloaded == null)
            return NotFound(new { error = "File not found." });

        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return File(downloaded.Bytes, downloaded.ContentType);
    }
}
