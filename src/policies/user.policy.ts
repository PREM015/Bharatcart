export class user.policyPolicy {
  canView(user: any, resource: any): boolean {
    // TODO: Implement view policy
    return true;
  }

  canCreate(user: any): boolean {
    // TODO: Implement create policy
    return true;
  }

  canUpdate(user: any, resource: any): boolean {
    // TODO: Implement update policy
    return true;
  }

  canDelete(user: any, resource: any): boolean{
    // TODO: Implement delete policy
    return true;
  }
}

export default new user.policyPolicy();
