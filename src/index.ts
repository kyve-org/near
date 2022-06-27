import KYVE, { Item } from '@kyve/core';
import { Signature } from './types';
import { fetchBlock, fetchHeight, isBlockNotFound } from './utils';
import { name, version } from '../package.json';

process.env.KYVE_RUNTIME = name;
process.env.KYVE_VERSION = version;

KYVE.metrics.register.setDefaultLabels({
  app: process.env.KYVE_RUNTIME,
});

class KyveNear extends KYVE {
  public async getDataItem(key: string): Promise<Item> {
    let block;

    const height = await fetchHeight(
      this.pool.config.rpc,
      await this.getSignature()
    );
    if (+key > height) throw new Error();

    try {
      block = await fetchBlock(
        this.pool.config.rpc,
        +key,
        await this.getSignature()
      );
    } catch (err) {
      if (isBlockNotFound(err)) return { key, value: null };

      this.logger.warn(`Failed to fetch block ${key}. Retrying ...`);

      throw err;
    }

    return { key, value: block };
  }

  public async getNextKey(key: string): Promise<string> {
    if (key) {
      return (parseInt(key) + 1).toString();
    }

    return '0';
  }

  public async formatValue(value: any): Promise<string> {
    return value.header?.hash ?? 'error';
  }

  private async getSignature(): Promise<Signature> {
    const address = await this.sdk.wallet.getAddress();
    const timestamp = new Date().valueOf().toString();

    const message = `${address}//${this.poolId}//${timestamp}`;

    const { signature, pub_key } = await this.sdk.signString(message);

    return {
      signature,
      pubKey: pub_key.value,
      poolId: this.poolId.toString(),
      timestamp,
    };
  }
}

// noinspection JSIgnoredPromiseFromCall
new KyveNear().start();
