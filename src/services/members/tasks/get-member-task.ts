// global
import { GraaspError } from 'util/graasp-error';
import { DatabaseTransactionHandler } from 'plugins/database';
import { TaskStatus } from 'interfaces/task';
import { Actor } from 'interfaces/actor';
// local
import { Member } from '../interfaces/member';
import { MemberService } from '../db-service';
import { BaseMemberTask } from './base-member-task';

export class GetMemberTask extends BaseMemberTask {
  get name() { return GetMemberTask.name; }

  constructor(actor: Actor, memberId: string, memberService: MemberService) {
    super(actor, memberService);
    this.targetId = memberId;
  }

  async run(handler: DatabaseTransactionHandler) {
    this._status = TaskStatus.Running;

    // get member
    const member = await this.memberService.get(this.targetId, handler, ['id', 'name']) as Member;
    if (!member) this.failWith(new GraaspError(GraaspError.MemberNotFound, this.targetId));

    this._status = TaskStatus.OK;
    this._result = member;
  }
}