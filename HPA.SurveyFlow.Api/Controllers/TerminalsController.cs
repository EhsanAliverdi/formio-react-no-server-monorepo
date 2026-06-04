using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Api.Controllers;

[ApiController]
[Route("api/terminals")]
public class TerminalsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var terminals = await db.Terminals
            .OrderBy(t => t.Description)
            .Select(t => new TerminalDto
            {
                Code = t.Code,
                Description = t.Description,
                Timezone = t.Timezone,
                PortCode = t.PortCode,
                TradingName = t.TradingName,
            })
            .ToListAsync();

        return Ok(terminals);
    }
}
