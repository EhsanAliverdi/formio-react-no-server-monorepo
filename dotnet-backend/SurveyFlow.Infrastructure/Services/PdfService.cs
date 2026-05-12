using PuppeteerSharp;
using PuppeteerSharp.Media;

namespace SurveyFlow.Infrastructure.Services;

public class PdfService
{
    private readonly SemaphoreSlim _browserLock = new(1, 1);
    private IBrowser? _browser;

    public async Task<byte[]> GeneratePdfAsync(string html)
    {
        var browser = await GetBrowserAsync();
        await using var page = await browser.NewPageAsync();
        await page.SetContentAsync(html, new NavigationOptions
        {
            WaitUntil = [WaitUntilNavigation.Networkidle0]
        });
        var pdfBytes = await page.PdfDataAsync(new PdfOptions
        {
            Format = PaperFormat.A4,
            PrintBackground = true,
            MarginOptions = new MarginOptions
            {
                Top = "10mm",
                Bottom = "10mm",
                Left = "10mm",
                Right = "10mm"
            }
        });
        return pdfBytes;
    }

    private async Task<IBrowser> GetBrowserAsync()
    {
        if (_browser != null && _browser.IsConnected) return _browser;

        await _browserLock.WaitAsync();
        try
        {
            if (_browser != null && _browser.IsConnected) return _browser;

            var wsEndpoint = Environment.GetEnvironmentVariable("CHROMIUM_WS_ENDPOINT");
            if (!string.IsNullOrEmpty(wsEndpoint))
            {
                _browser = await Puppeteer.ConnectAsync(new ConnectOptions { BrowserWSEndpoint = wsEndpoint });
            }
            else
            {
                var fetcher = new BrowserFetcher();
                await fetcher.DownloadAsync();
                _browser = await Puppeteer.LaunchAsync(new LaunchOptions
                {
                    Headless = true,
                    Args = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
                });
            }
            return _browser;
        }
        finally
        {
            _browserLock.Release();
        }
    }
}
