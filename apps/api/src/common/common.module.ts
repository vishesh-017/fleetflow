import { Global, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { SystemConfigService } from './system-config.service';

@Global()
@Module({
  providers: [NotificationService, SystemConfigService],
  exports: [NotificationService, SystemConfigService],
})
export class CommonModule {}
