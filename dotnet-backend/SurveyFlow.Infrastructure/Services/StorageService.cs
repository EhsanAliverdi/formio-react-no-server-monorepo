using System.Security.Cryptography;
using Amazon.S3;
using Amazon.S3.Model;

namespace SurveyFlow.Infrastructure.Services;

public class StorageService
{
    private readonly IAmazonS3 _s3;
    private readonly string _bucket;

    public StorageService(IAmazonS3 s3, string bucket)
    {
        _s3 = s3;
        _bucket = bucket;
    }

    public async Task EnsureBucketAsync()
    {
        try
        {
            await _s3.PutBucketAsync(new PutBucketRequest { BucketName = _bucket });
        }
        catch (AmazonS3Exception ex) when (ex.ErrorCode == "BucketAlreadyOwnedByYou" || ex.ErrorCode == "BucketAlreadyExists")
        {
            // already exists
        }
    }

    public async Task<StoredObject> UploadAsync(string key, byte[] bytes, string contentType, string? cacheControl = null)
    {
        var request = new PutObjectRequest
        {
            BucketName = _bucket,
            Key = key,
            ContentType = contentType,
            InputStream = new MemoryStream(bytes),
        };
        if (cacheControl != null)
            request.Headers.CacheControl = cacheControl;

        await _s3.PutObjectAsync(request);
        return new StoredObject(Bucket: _bucket, Key: key, Size: bytes.Length, ContentType: contentType);
    }

    public async Task<DownloadedObject?> DownloadAsync(string key)
    {
        try
        {
            var response = await _s3.GetObjectAsync(_bucket, key);
            using var ms = new MemoryStream();
            await response.ResponseStream.CopyToAsync(ms);
            return new DownloadedObject(Bytes: ms.ToArray(), ContentType: response.Headers.ContentType);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public static string BuildImagesKey(string originalName, string contentType)
    {
        var date = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var random = Convert.ToHexString(RandomNumberGenerator.GetBytes(8)).ToLower();
        var ext = Path.GetExtension(originalName).ToLower();
        if (string.IsNullOrEmpty(ext)) ext = MimeToExt(contentType);
        return $"images/{date}/{random}{ext}";
    }

    public static string BuildUserAvatarKey(int userId, string originalName, string contentType)
    {
        var date = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var random = Convert.ToHexString(RandomNumberGenerator.GetBytes(8)).ToLower();
        var ext = Path.GetExtension(originalName).ToLower();
        if (string.IsNullOrEmpty(ext)) ext = MimeToExt(contentType);
        return $"users/{userId}/avatars/{date}/{random}{ext}";
    }

    private static string MimeToExt(string contentType) => contentType switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/gif" => ".gif",
        "image/webp" => ".webp",
        _ => ".bin"
    };
}

public record StoredObject(string Bucket, string Key, long Size, string ContentType);
public record DownloadedObject(byte[] Bytes, string ContentType);
