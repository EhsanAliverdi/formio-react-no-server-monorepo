using Microsoft.Extensions.DependencyInjection;
using Quartz;
using Quartz.Spi;

namespace HPA.SurveyFlow.Infrastructure.Jobs.Scheduling;

/// <summary>
/// DI-aware Quartz job factory. Creates each job instance from the DI container
/// so scoped services (DbContext, MediatR, etc.) are injected correctly.
/// </summary>
public sealed class QuartzJobFactory(IServiceProvider serviceProvider) : IJobFactory
{
    public IJob NewJob(TriggerFiredBundle bundle, IScheduler scheduler)
    {
        var jobType = bundle.JobDetail.JobType;
        return (IJob)(ActivatorUtilities.CreateInstance(serviceProvider, jobType)
               ?? throw new InvalidOperationException($"Could not create job of type {jobType.FullName}"));
    }

    public void ReturnJob(IJob job)
    {
        if (job is IDisposable disposable)
            disposable.Dispose();
    }
}
