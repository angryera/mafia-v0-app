export {};

declare global {
  interface MafiaInventoryApi {
    getItemsByCategory: (opts: {
      chain: string;
      contractAddress: string;
      categoryId: number;
      maxItems?: number;
      onProgress?: (info: { fetched: number; batchIndex: number }) => void;
    }) => Promise<any[]>;
  }

  interface MafiaMapApi {
    getSlots: (opts: {
      chain: string;
      cityId: number;
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

  interface Window {
    MafiaInventory?: MafiaInventoryApi;
    MafiaMap?: MafiaMapApi;
    MafiaFamily?: MafiaFamilyApi;
    MafiaProfile?: MafiaProfileApi;
    MafiaDeposit?: MafiaDepositApi;
    MafiaWorth?: MafiaWorthApi;
    MafiaRaceLobby?: MafiaRaceLobbyApi;
  }
}
