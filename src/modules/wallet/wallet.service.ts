import { ethers } from 'ethers';
import ApiError from '../../utils/ApiError';
import Mnemonic from '../../models/Mnemonic';
import { encrypt } from '../../utils/crypto';
import logger from '../../config/logger';

class WalletService {
  async setMnemonic(plaintextMnemonic: string) {
    // Validate mnemonic is a real BIP-39 phrase
    try {
      ethers.Wallet.fromPhrase(plaintextMnemonic);
    } catch {
      throw ApiError.badRequest('Invalid mnemonic phrase');
    }

    const existing = await Mnemonic.findOne();

    if (existing) {
      existing.encryptedMnemonic = encrypt(plaintextMnemonic);
      existing.isEncrypted = true;
      existing.mnemonic = undefined;
      await existing.save();
      logger.info('System wallet mnemonic updated');
      return { message: 'Mnemonic updated successfully' };
    }

    await Mnemonic.createEncrypted(plaintextMnemonic);
    logger.info('System wallet mnemonic set');
    return { message: 'Mnemonic set successfully' };
  }

  async getStatus() {
    const existing = await Mnemonic.findOne();
    return {
      configured: !!existing,
      isEncrypted: existing?.isEncrypted ?? false,
      updatedAt: existing?.updatedAt ?? null,
    };
  }
}

export default new WalletService();
