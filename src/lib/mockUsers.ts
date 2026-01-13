import placeholderDP from "../assets/images/placeholderUser.png";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department: string;
};

export const mockLoggedInUser: MockUser = {
  id: "u1",
  name: "Alvi Binte Zamil",
  email: "alvi@example.com",
  avatar: placeholderDP,
  department: "CSE-23",
};

export const mockUsers: MockUser[] = [
  mockLoggedInUser,
  {
    id: "u2",
    name: "Tanvir T.",
    email: "tanvir@example.com",
    avatar: placeholderDP,
    department: "ECE-22",
  },
  {
    id: "u3",
    name: "Nusrat J.",
    email: "nusrat@example.com",
    avatar: placeholderDP,
    department: "ME-21",
  },
  {
    id: "u4",
    name: "Rahim U.",
    email: "rahim@example.com",
    avatar: placeholderDP,
    department: "CSE-23",
  },
  {
    id: "u5",
    name: "Karim A.",
    email: "karim@example.com",
    avatar: placeholderDP,
    department: "CEE-24",
  },
  {
    id: "u6",
    name: "Fatima S.",
    email: "fatima@example.com",
    avatar: placeholderDP,
    department: "IPE-22",
  },
  {
    id: "u7",
    name: "Zahid M.",
    email: "zahid@example.com",
    avatar: placeholderDP,
    department: "CSE-23",
  },
  {
    id: "u8",
    name: "Sumaiya R.",
    email: "sumaiya@example.com",
    avatar: placeholderDP,
    department: "CEE-23",
  },
];
