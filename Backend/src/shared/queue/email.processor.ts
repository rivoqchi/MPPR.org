import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EMAIL_QUEUE } from './queue.constants';

export interface EmailJobData {
  to: string;
  subject: string;
  body: string;
}

@Processor(EMAIL_QUEUE)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, body } = job.data;
    this.logger.log(`Sending email to ${to}: ${subject}`);
    this.logger.debug(body);
  }
}
