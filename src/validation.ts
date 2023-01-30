import { isAddress } from "ethers/lib/utils";
const re = new RegExp('^[a-zA-Z0-9 ]*$');

export const addressValidate = async (value): Promise<true | { error: string }> => {
  if (value == "") {
    return { error: "Can't be blank" };
  }
  if (!isAddress(value)) {
    return { error: "Not a valid Ethereum address" };
  }
  return true;
};

export const required = async (value, type): Promise<true | { error: string }> => {
  if (type == 'text' && value == "") {
    return { error: "Can't be blank" };
  }
  if (type == 'text' && !re.test(value)) {
    return { error: "Enter valid string" };
  }
  if (type == 'number' && (value == undefined || value == null || value == "")) {
    return { error: "Can't be blank" };
  }
  if (value == undefined || value == null) {
    return { error: "Can't be blank" };
  }
  return true;
};

export const defaultValidator = async (value, type): Promise<true | { error: string }> => {
  // if (type == 'text' && !re.test(value)) {
  //   return { error: "Enter valid string" };
  // }
  return true;
};