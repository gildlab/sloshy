import { concat, type Hexable, hexlify, zeroPad } from "ethers/lib/utils";

import type { BytesLike } from "ethers";
import  { ethers } from "ethers";



export function bytify(
  value: number | BytesLike | Hexable,
  bytesLength = 1
): BytesLike {
  return zeroPad(hexlify(value), bytesLength);
} 

const hex2bin = (hex) => { 
  hex = hex.split('x')[1]
  const bytes = [];
  for (let i = 0; i < hex.length - 1; i += 2) {
    bytes.push(parseInt(hex.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
}; 

const isValidUTF8 = (bytes) => {  
  const decoder = new TextDecoder("utf-8"); 

  const hexBytes = hex2bin(bytes)
  // Decode the bytes with the TextDecoder object
  const str = decoder.decode(hexBytes);

  // Check if the string contains any replacement characters
  const regex = /\uFFFD/g;
  return !regex.test(str);
}; 

export function hex_to_ascii(str1)
{   

  if(isValidUTF8(str1)){ 
    
    let str = str1.split('x')[1]
    return {
      isValid : true ,
      asciiString : decodeURIComponent(str.replace(/(..)/g,'%$1'))
    }

  }else{ 

    return {
      isValid : false ,
      asciiString : ''
    }
    
  }
  
}

export function memoryOperand(type: number, offset: number): number {
  return (offset << 1) + type;
}

export enum MemoryType {
  Stack,
  Constant,
}

export function op(
  code: number,
  erand: number | BytesLike | Hexable = 0
): Uint8Array {
  return concat([bytify(code, 2), bytify(erand, 2)]);
}


export enum AllStandardOps {
  CHAINLINK_PRICE,
  CALL,
  CONTEXT,
  CONTEXT_ROW,
  DEBUG,
  DO_WHILE,
  FOLD_CONTEXT,
  GET,
  LOOP_N,
  READ_MEMORY,
  SET,
  HASH,
  ERC20_BALANCE_OF,
  ERC20_TOTAL_SUPPLY,
  ERC20_SNAPSHOT_BALANCE_OF_AT,
  ERC20_SNAPSHOT_TOTAL_SUPPLY_AT,
  IERC721_BALANCE_OF,
  IERC721_OWNER_OF,
  IERC1155_BALANCE_OF,
  IERC1155_BALANCE_OF_BATCH,
  ENSURE,
  BLOCK_NUMBER,
  BLOCK_TIMESTAMP,
  EXPLODE32,
  SCALE18,
  SCALE18_DIV,
  SCALE18_MUL,
  SCALE_BY,
  SCALEN,
  ANY,
  EAGER_IF,
  EQUAL_TO,
  EVERY,
  GREATER_THAN,
  ISZERO,
  LESS_THAN,
  SATURATING_ADD,
  SATURATING_MUL,
  SATURATING_SUB,
  ADD,
  DIV,
  EXP,
  MAX,
  MIN,
  MOD,
  MUL,
  SUB,
  IORDERBOOKV1_VAULT_BALANCE,
  ISALEV2_REMAINING_TOKEN_INVENTORY,
  ISALEV2_RESERVE,
  ISALEV2_SALE_STATUS,
  ISALEV2_TOKEN,
  ISALEV2_TOTAL_RESERVE_RECEIVED,
  IVERIFYV1_ACCOUNT_STATUS_AT_TIME,
  ITIERV2_REPORT,
  ITIERV2_REPORT_TIME_FOR_TIER,
  SATURATING_DIFF,
  SELECT_LTE,
  UPDATE_TIMES_FOR_TIER_RANGE,
  length,
}

export const Opcode = AllStandardOps;

export const eighteenZeros = "000000000000000000";
export const fourZeros = "0000";
export const sixZeros = "000000";
export const nineZeros = "000000000";
export const tenZeros = "0000000000";
export const sixteenZeros = "0000000000000000";

export const ONE = ethers.BigNumber.from("1" + eighteenZeros);
export const RESERVE_ONE = ethers.BigNumber.from("1" + sixZeros);

export const max_uint256 = ethers.BigNumber.from(
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
);
export const max_uint32 = ethers.BigNumber.from("0xffffffff");
export const max_uint16 = ethers.BigNumber.from("0xffff");
export const max_uint8 = ethers.BigNumber.from("0xff");

