export { };

declare global {
  interface MafiaInventoryApi {
    getItemsByCategory: (opts: {
      chain: string;
      contractAddress: string;
      categoryId: number;
      maxItems?: number;
      onProgress?: (info: { fetched: number; batchIndex: number }) => void;
    }) => Promise<any[]>;

    getAllItemsByOwner: (opts: {
      chain: string;
      owner: string;
      onProgress?: (info: { fetched: number; batchIndex: number }) => void;
    }) => Promise<any[]>;
  }

  interface MafiaMapApi {
    getSlots: (opts: {
      chain: string;
      cityId: number;
    }) => Promise<any[]>;

    getLandSlotsByOwner: (opts: {
      chain: string;
      owner: string;
      cityIds: number[];
      requireInventoryItem: boolean;
      onProgress?: (info: { fetched: number; batchIndex: number }) => void;
    }) => Promise<any[]>;
  }

  interface MafiaFamilyApi {
    getFamiliesWithPlayers: (options: {
      chain: string;
      onProgress?: (info: { step: string; fetched: number; batchIndex?: number }) => void;
    }) => Promise<any[]>;
  }

  interface MafiaProfileApi {
    getUsersInfo: (options: {
      chain: string;
      onProgress?: (info: { fetched: number; batchIndex: number }) => void;
    }) => Promise<any[]>;
  }

  interface MafiaDepositApi {
    getLiquidityPositions: (opts: { chain: string }) => Promise<any[]>;
  }

  interface MafiaWorthApi {
    computeWorth: (params: {
      chain: string;
      player: string;
      signMsg: string;
      signature: string;
    }) => Promise<any>;
  }

  interface MafiaRaceLobbyApi {
    getRaces: (opts: {
      chain: string;
      pageSize: number;
    }) => Promise<any[]>;
  }

  interface MafiaExchangeApi {
    getOTCOffers: (opts: {
      chain: string;
      startIndex: number;
      length: number;
      contractAddress: string;
    }) => Promise<any[]>;
  }

  interface Window {
    MafiaInventory?: MafiaInventoryApi;
    MafiaMapApi?: MafiaMapApi;
    MafiaMap?: MafiaMapApi;
    MafiaFamily?: MafiaFamilyApi;
    MafiaProfile?: MafiaProfileApi;
    MafiaDeposit?: MafiaDepositApi;
    MafiaWorth?: MafiaWorthApi;
    MafiaRaceLobby?: MafiaRaceLobbyApi;
    MafiaExchange?: MafiaExchangeApi;
  }
}
