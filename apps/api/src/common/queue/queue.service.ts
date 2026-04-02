import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, JobOptions } from 'bull';

export type JobName =
  | 'send-verification-email'
  | 'send-ticket-email'
  | 'release-seat-lock'
  | 'process-bulk-refund'
  | 'process-payout'
  | 'send-event-reminder'
  | 'send-capacity-warning'
  | 'generate-ticket-pdf'
  | 'send-refund-notification'
  | 'send-event-cancelled-notification'
  | 'send-event-postponed-notification'
  | 'send-login-alert';

const DEFAULT_JOB_OPTIONS: JobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 50,
};

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('notifications') private notifQueue: Queue,
    @InjectQueue('payments') private payQueue: Queue,
    @InjectQueue('tickets') private tktQueue: Queue,
  ) {}

  async add(jobName: JobName, data: Record<string, unknown>, opts?: JobOptions) {
    const queue = this.getQueue(jobName);
    return queue.add(jobName, data, { ...DEFAULT_JOB_OPTIONS, ...opts });
  }

  private getQueue(jobName: JobName): Queue {
    const paymentJobs: JobName[] = [
      'process-bulk-refund',
      'process-payout',
      'send-refund-notification',
    ];
    const ticketJobs: JobName[] = [
      'release-seat-lock',
      'send-ticket-email',
      'generate-ticket-pdf',
    ];

    if (paymentJobs.includes(jobName)) return this.payQueue;
    if (ticketJobs.includes(jobName)) return this.tktQueue;
    return this.notifQueue;
  }
}
