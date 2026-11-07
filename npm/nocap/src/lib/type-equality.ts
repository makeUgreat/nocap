// Mutual assignability is not enough: a type with one more optional field is still assignable both ways.
// This form compares the types themselves, so optional fields and readonly modifiers must also match.
export type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false
