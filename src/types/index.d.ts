import fastify from 'fastify';

import { Database } from '../plugins/database';
import { ItemService } from '../services/items/db-service';
import { ItemMembershipService } from '../services/item-memberships/db-service';
import { MemberService } from '../services/members/db-service';
import { Member } from '../services/members/interfaces/member';

declare module 'fastify' {
  interface FastifyInstance {
    db: Database;
    memberService: MemberService;
    itemService: ItemService;
    itemMembershipService: ItemMembershipService;
    validateSession: any; // authPlugin
  }

  interface FastifyRequest {
    member: Member;
  }
}

export { Item } from '../services/items/interfaces/item';
export { ItemTaskManager } from '../services/items/task-manager';

export { Member } from '../services/members/interfaces/member'
