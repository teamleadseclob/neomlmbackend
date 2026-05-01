import mongoose, { Schema } from 'mongoose';
import { IMnemonic, IMnemonicModel } from '../types';
import { encrypt, decrypt } from '../utils/crypto';

const mnemonicSchema = new Schema<IMnemonic>(
  {
    encryptedMnemonic: {
      type: String,
      required: true,
    },
    mnemonic: {
      type: String,
      required: false,
    },
    isEncrypted: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

mnemonicSchema
  .virtual('plaintextMnemonic')
  .get(function (this: IMnemonic) {
    if (this.isEncrypted && this.encryptedMnemonic) return decrypt(this.encryptedMnemonic);
    return this.mnemonic;
  })
  .set(function (this: IMnemonic, plaintext: string) {
    this.encryptedMnemonic = encrypt(plaintext);
    this.isEncrypted = true;
    this.mnemonic = undefined;
  });

mnemonicSchema.statics.createEncrypted = async function (plaintextMnemonic: string) {
  const doc = new this();
  (doc as any).plaintextMnemonic = plaintextMnemonic;
  return doc.save();
};

mnemonicSchema.statics.getDecrypted = async function () {
  const doc = await this.findOne();
  if (!doc) return null;
  return (doc as any).plaintextMnemonic;
};

const Mnemonic = mongoose.model<IMnemonic, IMnemonicModel>('Mnemonic', mnemonicSchema);

export default Mnemonic;
