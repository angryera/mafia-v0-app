export interface FamilyMember {
  address: string;
  name: string;
  familyId: number;
  level: number;
  isDead: boolean;
  isJailed: boolean;
  gender: number;
  country: string;
  jailedUntil: number;
}

export interface FamilyLeader extends FamilyMember {
  role: string;
}

export type FamilySuccessor = FamilyMember;
export type FamilyPlayer = FamilyMember;

export interface Family {
  familyId: number;
  leaders: FamilyLeader[];
  successor: FamilySuccessor;
  leaveFee: number;
  memberCount: number;
  isDead: boolean;
  name: string;
  players: FamilyPlayer[];
}
