export type GuestV2 = {
  id: string;
  first_name: string;
  last_name: string;
  group_id?: string | null;
  party_id?: string | null;
  category?: string | null;
  is_child: boolean;
  dietary_restrictions?: string | null;
  menu_choice?: string | null;
  is_plus_one?: boolean;
  plus_one_of_guest_id?: string;
};

export type TableV2 = {
  id: string;
  name: string;
  capacity: number;
  shape?: string | null;
  table_type?: string | null;
};

export type AssignmentV2 = {
  id: string;
  table_id: string;
  guest_id: string;
  seat_position?: number | null;
};

export type GuestGroupV2 = {
  id: string;
  name: string;
};
