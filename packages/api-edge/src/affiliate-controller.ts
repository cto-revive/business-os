import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import type {
  AffiliateActorContext,
  AffiliateCommissionStatus,
  CreateAffiliateLinkInput,
  CreateAffiliatePartnerInput,
  CreateAffiliateReferralInput,
  CreateAffiliateRuleInput,
  ConvertAffiliateReferralInput,
} from '@business-os/sales-crm-contracts';
import { AffiliateAccessError, AffiliateRuntime } from '@business-os/sales-crm-runtime';
import { PlatformAccessError, PlatformRuntime } from '@business-os/platform-runtime';

const SESSION_COOKIE = 'bos_session';
function cookieValue(header: string | undefined): string | undefined {
  return header
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
}
function errorResponse(error: unknown): HttpException {
  if (error instanceof AffiliateAccessError)
    return new HttpException(
      { error: { code: error.code, message: error.message } },
      error.code === 'PERMISSION_DENIED'
        ? HttpStatus.FORBIDDEN
        : error.code === 'NOT_FOUND'
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_REQUEST,
    );
  if (error instanceof PlatformAccessError)
    return new HttpException(
      { error: { code: error.code, message: error.message } },
      error.code === 'AUTHENTICATION_REQUIRED' ? HttpStatus.UNAUTHORIZED : HttpStatus.FORBIDDEN,
    );
  console.error('Affiliate request failed', error);
  return new HttpException(
    { error: { code: 'INTERNAL_ERROR', message: 'An unexpected server error occurred' } },
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}

@Controller('/api/v1/crm/affiliates')
export class AffiliateController {
  public constructor(
    private readonly runtime: AffiliateRuntime,
    private readonly platform: PlatformRuntime,
  ) {}
  private async actor(cookie: string | undefined): Promise<AffiliateActorContext> {
    const context = await this.platform.getAuthenticatedContext(cookieValue(cookie));
    return {
      organizationId: context.session.organizationId,
      principalId: context.session.userId,
      role: context.membership.role,
    };
  }
  @Get('/partners')
  async partners(@Headers('cookie') cookie: string | undefined) {
    try {
      return { partners: await this.runtime.listPartners(await this.actor(cookie)) };
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Post('/partners')
  async createPartner(
    @Headers('cookie') cookie: string | undefined,
    @Body() body: CreateAffiliatePartnerInput,
  ) {
    try {
      return await this.runtime.createPartner(await this.actor(cookie), body);
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Get('/links')
  async links(@Headers('cookie') cookie: string | undefined) {
    try {
      return { links: await this.runtime.listLinks(await this.actor(cookie)) };
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Post('/links')
  async createLink(
    @Headers('cookie') cookie: string | undefined,
    @Body() body: CreateAffiliateLinkInput,
  ) {
    try {
      return await this.runtime.createLink(await this.actor(cookie), body);
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Get('/rules')
  async rules(@Headers('cookie') cookie: string | undefined) {
    try {
      return { rules: await this.runtime.listRules(await this.actor(cookie)) };
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Post('/rules')
  async createRule(
    @Headers('cookie') cookie: string | undefined,
    @Body() body: CreateAffiliateRuleInput,
  ) {
    try {
      return await this.runtime.createRule(await this.actor(cookie), body);
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Get('/referrals')
  async referrals(@Headers('cookie') cookie: string | undefined) {
    try {
      return { referrals: await this.runtime.listReferrals(await this.actor(cookie)) };
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Post('/referrals')
  async createReferral(
    @Headers('cookie') cookie: string | undefined,
    @Body() body: CreateAffiliateReferralInput,
  ) {
    try {
      return await this.runtime.createReferral(await this.actor(cookie), body);
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Post('/referrals/:id/convert')
  async convertReferral(
    @Headers('cookie') cookie: string | undefined,
    @Param('id') id: string,
    @Body() body: ConvertAffiliateReferralInput,
  ) {
    try {
      return await this.runtime.convertReferral(await this.actor(cookie), id, body);
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Get('/commissions')
  async commissions(@Headers('cookie') cookie: string | undefined) {
    try {
      return { commissions: await this.runtime.listCommissions(await this.actor(cookie)) };
    } catch (error) {
      throw errorResponse(error);
    }
  }
  @Post('/commissions/:id/status')
  async updateCommissionStatus(
    @Headers('cookie') cookie: string | undefined,
    @Param('id') id: string,
    @Body() body: { status: AffiliateCommissionStatus },
  ) {
    try {
      return await this.runtime.updateCommissionStatus(await this.actor(cookie), id, body.status);
    } catch (error) {
      throw errorResponse(error);
    }
  }
}
