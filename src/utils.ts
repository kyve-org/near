import { connect } from 'near-api-js';
import { NearConfig } from 'near-api-js/lib/near';
import { Provider } from 'near-api-js/lib/providers';
import { ChunkResult } from 'near-api-js/lib/providers/provider';
import { NOT_FOUND, Signature } from './types';

export async function fetchHeight(
  endpoint: string,
  signature: Signature
): Promise<number> {
  const provider = await initialiseNearRPC(endpoint, signature);

  const latestBlock = await provider.block({
    finality: 'final',
  });

  return latestBlock.header.height;
}

export async function fetchBlock(
  endpoint: string,
  height: number,
  signature: Signature
): Promise<any> {
  const provider = await initialiseNearRPC(endpoint, signature);

  const block = await provider.block({
    blockId: height,
  });

  const chunks = await fetchChunks(
    endpoint,
    block.chunks.map((chunk) => chunk.chunk_hash),
    signature
  );

  return {
    ...block,
    chunks,
  };
}

async function fetchChunks(
  endpoint: string,
  hashes: string[],
  signature: Signature
): Promise<any[]> {
  const provider = await initialiseNearRPC(endpoint, signature);
  const chunks: ChunkResult[] = [];

  for (const hash of hashes) {
    const chunk = await provider.chunk(hash);
    chunks.push(chunk);
  }

  return chunks;
}

async function initialiseNearRPC(
  endpoint: string,
  signature: Signature
): Promise<Provider> {
  const config: NearConfig = {
    // @ts-ignore
    deps: {},
    networkId: 'mainnet',
    nodeUrl: endpoint,
    headers: {
      'Content-Type': 'application/json',
      Signature: signature.signature,
      'Public-Key': signature.pubKey,
      'Pool-ID': signature.poolId,
      Timestamp: signature.timestamp,
    },
  };

  const client = await connect(config);
  return client.connection.provider;
}

export function isBlockNotFound(err: any): boolean {
  return new Error(err).message.includes(NOT_FOUND);
}
