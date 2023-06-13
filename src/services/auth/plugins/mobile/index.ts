import { StatusCodes } from 'http-status-codes';

import { FastifyPluginAsync } from 'fastify';

import { DEFAULT_LANG, RecaptchaAction } from '@graasp/sdk';

import { buildRepositories } from '../../../../utils/repositories';
import { MemberPasswordService } from '../password/service';
import { mPasswordLogin, mauth, mdeepLink, mlogin, mregister } from './schemas';
import { MobileService } from './service';

// token based auth and endpoints for mobile
const plugin: FastifyPluginAsync = async (fastify) => {
  const { log, db, generateAuthTokensPair } = fastify;

  const mobileService = new MobileService(fastify, log);
  const memberPasswordService = new MemberPasswordService(log);

  // no need to add CORS support here - only used by mobile app

  fastify.decorateRequest('memberId', null);

  fastify.post<{
    Body: { name: string; email: string; challenge: string; captcha: string };
    Querystring: { lang?: string };
  }>('/register', { schema: mregister }, async (request, reply) => {
    const {
      body,
      query: { lang = DEFAULT_LANG },
      log,
    } = request;

    // validate captcha
    await fastify.validateCaptcha(request, body.captcha, RecaptchaAction.SignUpMobile);

    return db.transaction(async (manager) => {
      await mobileService.register(undefined, buildRepositories(manager), body, lang);
      reply.status(StatusCodes.NO_CONTENT);
    });
  });

  fastify.post<{
    Body: { email: string; challenge: string; captcha: string };
    Querystring: { lang?: string };
  }>('/login', { schema: mlogin }, async (request, reply) => {
    const {
      body,
      query: { lang },
    } = request;

    // validate captcha
    await fastify.validateCaptcha(request, body.captcha, RecaptchaAction.SignInMobile);

    await mobileService.login(undefined, buildRepositories(), body, lang);
    reply.status(StatusCodes.NO_CONTENT);
  });

  // login with password
  fastify.post<{ Body: { email: string; challenge: string; password: string; captcha: string } }>(
    '/login-password',
    { schema: mPasswordLogin },
    async (request, reply) => {
      const { body } = request;

      // validate captcha
      await fastify.validateCaptcha(
        request,
        body.captcha,
        RecaptchaAction.SignInWithPasswordMobile,
      );

      const token = await memberPasswordService.login(
        undefined,
        buildRepositories(),
        body,
        body.challenge,
      );

      reply.status(StatusCodes.OK).send({ t: token });
    },
  );

  fastify.post<{ Body: { t: string; verifier: string } }>(
    '/auth',
    { schema: mauth },
    async ({ body: { t: token, verifier } }) => {
      return mobileService.auth(undefined, buildRepositories(), token, verifier);
    },
  );

  fastify.get(
    '/auth/refresh', // there's a hardcoded reference to this path above: "verifyMemberInAuthToken()"
    { preHandler: fastify.verifyBearerAuth },
    async ({ memberId }) => generateAuthTokensPair(memberId),
  );

  fastify.get<{ Querystring: { t: string } }>(
    '/deep-link',
    { schema: mdeepLink },
    async ({ query: { t } }, reply) => {
      reply.type('text/html');
      // TODO: this can be improved
      return `
          <!DOCTYPE html>
          <html>
            <body style="display: flex; justify-content: center; align-items: center; height: 100vh;
              font-family: sans-serif;">
              <a style="background-color: #5050d2;
                color: white;
                padding: 1em 1.5em;
                text-decoration: none;"
                href="graasp-mobile-builder://auth?t=${t}">Open with Graasp app</>
            </body>
          </html>
        `;
    },
  );
};

export default plugin;