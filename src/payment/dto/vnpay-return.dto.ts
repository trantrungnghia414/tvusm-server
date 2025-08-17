import { IsString, IsOptional } from 'class-validator';

export class VnpayReturnDto {
  @IsString()
  vnp_Amount: string;

  @IsString()
  vnp_BankCode: string;

  @IsOptional()
  @IsString()
  vnp_BankTranNo?: string;

  @IsString()
  vnp_CardType: string;

  @IsString()
  vnp_OrderInfo: string;

  @IsString()
  vnp_PayDate: string;

  @IsString()
  vnp_ResponseCode: string;

  @IsString()
  vnp_TmnCode: string;

  @IsString()
  vnp_TransactionNo: string;

  @IsString()
  vnp_TransactionStatus: string;

  @IsString()
  vnp_TxnRef: string;

  @IsString()
  vnp_SecureHash: string;
}
