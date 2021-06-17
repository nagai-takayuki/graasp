// global
import { FastifyPluginAsync } from 'fastify';
import { IdParam } from '../../interfaces/requests';
// local
import common, {
  getItems,
  create,
  updateOne,
  deleteOne
} from './schemas';
import { PurgeBelowParam } from './interfaces/requests';
import { ItemMembershipTaskManager } from './interfaces/item-membership-task-manager';
import { TaskManager } from './task-manager';

const ROUTES_PREFIX = '/item-memberships';

const plugin: FastifyPluginAsync = async (fastify) => {
  const { items: { dbService: itemsDbService }, itemMemberships, taskRunner: runner } = fastify;
  const { dbService } = itemMemberships;
  const taskManager: ItemMembershipTaskManager = new TaskManager(itemsDbService, dbService);
  itemMemberships.taskManager = taskManager;

  // schemas
  fastify.addSchema(common);

  // routes
  fastify.register(async function (fastify) {
    // auth plugin session validation
    fastify.addHook('preHandler', fastify.verifyMemberInSessionOrAuthToken);

    // get item's memberships
    fastify.get<{ Querystring: { itemId: string } }>(
      '/', { schema: getItems },
      async ({ member, query: { itemId }, log }) => {
        const task = taskManager.createGetOfItemTask(member, itemId);
        return runner.runSingle(task, log);
      }
    );

    // create item membership
    fastify.post<{ Querystring: { itemId: string } }>(
      '/', { schema: create },
      async ({ member, query: { itemId }, body, log }) => {
        const task = taskManager.createCreateTask(member, body, itemId);
        return runner.runSingle(task, log);
      }
    );

    // update item membership
    fastify.patch<{ Params: IdParam }>(
      '/:id', { schema: updateOne },
      async ({ member, params: { id }, body, log }) => {
        const task = taskManager.createUpdateTask(member, id, body);
        return runner.runSingle(task, log);
      }
    );

    // delete item membership
    fastify.delete<{ Params: IdParam; Querystring: PurgeBelowParam }>(
      '/:id', { schema: deleteOne },
      async ({ member, params: { id }, query: { purgeBelow }, log }) => {
        const task = taskManager.createDeleteTask(member, id, purgeBelow);
        return runner.runSingle(task, log);
      }
    );

  }, { prefix: ROUTES_PREFIX });
};

export default plugin;
