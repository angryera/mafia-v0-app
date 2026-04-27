import { getAddress } from "viem";
import { ChainId } from "../contract";

export type ChainConfig = {
    id: ChainId;
    label: string;
    wagmiChainId: number;
    rpc: string;
    explorer: string;
    signDomain: string;
    addresses: {
        crime: `0x${string}`;
        ingameCurrency: `0x${string}`;
        travel: `0x${string}`;
        nickcar: `0x${string}`;
        killskill: `0x${string}`;
        jail: `0x${string}`;
        helperbot: `0x${string}`;
        wbnb: `0x${string}`;
        chainlinkPriceFeed: `0x${string}`;
        buyCredit: `0x${string}`;
        buyPerkbox: `0x${string}`;
        buyKeys: `0x${string}`;
        userProfile: `0x${string}`;
        bullets: `0x${string}`;
        health: `0x${string}`;
        giCredits: `0x${string}`;
        power: `0x${string}`;
        hospital: `0x${string}`;
        bulletFactory: `0x${string}`;
        shop: `0x${string}`;
        rankXp: `0x${string}`;
        swapRouter: `0x${string}`;
        inventory: `0x${string}`;
        perkOpener: `0x${string}`;
        roulette: `0x${string}`;
        slotMachine: `0x${string}`;
        playerSubscription: `0x${string}`;
        raceXp: `0x${string}`;
        carCrusher: `0x${string}`;
        jackpot: `0x${string}`;
        safehouse: `0x${string}`;
        detectiveAgency: `0x${string}`;
        rankStake: `0x${string}`;
        bodyguardTraining: `0x${string}`;
        equipment: `0x${string}`;
        mafia: `0x${string}`;
        /** ERC1155 OG Crate (keys); balanceOf(account, 0), setApprovalForAll for map. */
        ogCrate: `0x${string}`;
        map: `0x${string}`;
        /** MafiaFamily — `getPlayerInfo(player)` for familyId / level / isDead. */
        mafiaFamily: `0x${string}`;
        ocLobby: `0x${string}`;
        ocJoin: `0x${string}`;
        ocExecution: `0x${string}`;
        smuggleMarket: `0x${string}`;
        storyMode: `0x${string}`;
        weeklyMission: `0x${string}`;
        xpMarket: `0x${string}`;
        inventoryMarketplace: `0x${string}`;
        raceLobby: `0x${string}`;
    };
};

export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
    bnb: {
        id: "bnb",
        label: "BNB Chain",
        wagmiChainId: 56,
        rpc: "https://bsc-dataseed1.binance.org",
        explorer: "https://bscscan.com",
        signDomain: "bnb.playmafia.io",
        addresses: {
            crime: getAddress("0x167ad284C7bcc4d6342991Aa258422E7a04f926E"),
            ingameCurrency: getAddress("0x376554F7BbcdeB348fa4b8371135b87eC6b29c38"),
            travel: getAddress("0xa08D627E071cB4b53C6D0611d77dbCB659902AA4"),
            nickcar: getAddress("0x60B8e0dd9566b42F9CAa5538350aA0D29988373c"),
            killskill: getAddress("0xa5dc2Cb4dC13f12d8464eaA862fAC00F19ADc84d"),
            jail: getAddress("0x7371580cd13dE739C734AE85062F75194d13Fac2"),
            helperbot: getAddress("0xE2E4506c23C26eea2526d0e4dBb8dbF9cDa9d105"),
            wbnb: getAddress("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"),
            chainlinkPriceFeed: getAddress("0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE"),
            buyCredit: getAddress("0x192F029CC7e0BB80dB201191E0040e8F801df34d"),
            buyPerkbox: getAddress("0x55849c0F5A567A49d219B00642A4648389ada6f6"),
            buyKeys: getAddress("0x1F4Eb51E87C4e2368316dba8e478Cd561FEb8B77"),
            userProfile: getAddress("0xa08D627E071cB4b53C6D0611d77dbCB659902AA4"),
            bullets: getAddress("0xa42AE5D3E84bff9cD2C734A072232D9629f2ED16"),
            health: getAddress("0xC63668378B83f3E58A9AAAe6E12Da3282F150225"),
            giCredits: getAddress("0x21b6833B76A4AD783fe681c04Fc9F3a3a0A5b0B7"),
            power: getAddress("0xa2AA522B4CCBc95Dec0aFCa2B0c645f9C126cD24"),
            hospital: getAddress("0xB4c9ef457e17992f9271B447de3507016fd0E0d7"),
            bulletFactory: getAddress("0xAbfdA460fFEa2697A4d0b17e955bc17e87b6d45E"),
            shop: getAddress("0xd922255cCeb4f97e2830038E4e7EF54Cb62B6733"),
            rankXp: getAddress("0x48F2C9C0ea337854492aF5bEbEa74e8917712B71"),
            swapRouter: getAddress("0xe7cb02aDa01A2100C83De3ab73d93ed18fbd9636"),
            inventory: getAddress("0x2CB8352Be090846d4878Faa92825188D7bf50654"),
            perkOpener: getAddress("0x26563e46A96a07e66BC01Ad6b1b41B42a33364F8"),
            roulette: getAddress("0x53e579dC9BE49B6Bac08c6F9ffA83D981A9A19F3"),
            slotMachine: getAddress("0xa593553bdbA38730226aaabF07D241a16a3fc005"),
            playerSubscription: getAddress("0x3CEef7Fe3CcF730b87D0bFC651c680a7a76dCa61"),
            raceXp: getAddress("0x05BE7743913dECe53D93E22120279f0630014743"),
            carCrusher: getAddress("0xC17B536db3431040f1F2A8980B2Eb80B814dD022"),
            jackpot: getAddress("0x2FAcF1371d3e67B98A27490321655ac059f675B2"),
            safehouse: getAddress("0x6c7e8317698986c0B92FdDB7CA3086234B5e5F60"),
            detectiveAgency: getAddress("0x0cCA060E6c22A67eF17E657342548A467D96B3CD"),
            rankStake: getAddress("0xDFfCf5D284D2bA80376BAba90F37494D60fe8820"),
            bodyguardTraining: getAddress("0xb7D6c0B1a176711C98cceF191Eb5528F2e703fd5"),
            equipment: getAddress("0xa2AA522B4CCBc95Dec0aFCa2B0c645f9C126cD24"),
            mafia: getAddress("0x3cb3F4f43D4Be61AA92BB4EEFfe7142A13bf4111"),
            ogCrate: getAddress("0x16B11C057cA6d354E81D58B375CB118f7930807c"),
            map: getAddress("0x1c88060e4509c59b4064A7a9818f64AeC41ef19E"),
            mafiaFamily: getAddress("0x1bC581fe134BdC7432eF8ba75BCeEd242F90BcD2"),
            ocLobby: getAddress("0x281C0Db67c96ee7Ad32AF25817cB3964Fc7E79cD"),
            ocJoin: getAddress("0x00D0933595F87eD8b50638796FCf5b22de3795a2"),
            ocExecution: getAddress("0xC813f8EA6668eAb88e157d00F00aeBCb2b5F56C0"),
            smuggleMarket: getAddress("0x36b09f1854CF3614Eb8d10fFae847511BB08868e"),
            storyMode: getAddress("0x4D9d610092B233a24193CB686De1A8746C5224f8"),
            weeklyMission: getAddress("0xc82d2eD039af6f01b4A44a11699a73EEB90cBAbB"),
            xpMarket: getAddress("0x49F23822AFa248D4bE453d630F7e0dF8fcF80854"),
            inventoryMarketplace: getAddress("0x1fb8C9F810afd99A6FAE3E81aBe0806f8796ba73"),
            raceLobby: getAddress("0xE3a3892fEC9bA9457fEE08Fe3d2E7b32bCeb33Ad"),
        },
    },
    pulsechain: {
        id: "pulsechain",
        label: "PulseChain",
        wagmiChainId: 369,
        rpc: "https://rpc.pulsechain.com",
        explorer: "https://scan.pulsechain.com",
        signDomain: "pulse.playmafia.io",
        addresses: {
            crime: getAddress("0xf077d4d0508505c5a80249aFC10bc6Ead90E47F1"),
            ingameCurrency: getAddress("0x839340bDC0b0E4449b7e1dEBD0db7E93861Ed1D9"),
            travel: getAddress("0x7FB6A056877c1da14a63bFECdE95ebbFa854f07F"),
            nickcar: getAddress("0x2bf1EEaa4e1D7502AeF7f5beCCf64356eDb4a8c8"),
            killskill: getAddress("0xdC45E5469A8B6D020473F69fEC91C0f0e83a3308"),
            jail: getAddress("0xDCD5E9c0b2b4E9Cb93677A258521D854b3A9f5A1"),
            helperbot: getAddress("0x6Ea05BaDD5B6e4226a49Af087eFd2A22c410e6cc"),
            wbnb: getAddress("0x0000000000000000000000000000000000000000"),
            chainlinkPriceFeed: getAddress("0x0000000000000000000000000000000000000000"),
            buyCredit: getAddress("0x9D2417e5cB35abaae331b32fb262c75A258a0717"),
            buyPerkbox: getAddress("0xF3B4F7d0ec795B555e12BC70150dDb1081FdA403"),
            buyKeys: getAddress("0x7FE7220E6A8AAB508c60be9d48fEfacDbe6BC179"),
            userProfile: getAddress("0x7FB6A056877c1da14a63bFECdE95ebbFa854f07F"),
            bullets: getAddress("0x98f0d50b77BCcd657ecfa2E5C1E4915c6f4565B8"),
            health: getAddress("0xA3b9a5E273a9199bbD64fFf81f369FEa0A3a0E1F"),
            giCredits: getAddress("0xEDe999DDF33851F99e450468dE7251CcE96e2A72"),
            power: getAddress("0x37edFc50908e194f05912EA0BC812Cd2f1Eb5bE4"),
            hospital: getAddress("0x222e69D7e1CA26D4Bbbd80637Dd49a8C07c3c8A1"),
            bulletFactory: getAddress("0x7770699325422632E76513823D84661D36AE8e6A"),
            shop: getAddress("0xd442356eF1c11f1B577c89542882c032E8DB82FE"),
            rankXp: getAddress("0x74eADd7ebeeED638FD7c413134FA3D3433699D92"),
            swapRouter: getAddress("0xf89DFF55EE67F4247cd0D351e75080f07c1f4D2B"),
            inventory: getAddress("0x2c60de22Ec20CcE72245311579c4aD9e5394Adc4"),
            perkOpener: getAddress("0xE3a3892fEC9bA9457fEE08Fe3d2E7b32bCeb33Ad"),
            roulette: getAddress("0xD49Df542a9278464E7E18af52AB93D40D3430A9F"),
            slotMachine: getAddress("0x52A929a1D43C18c6De571189D1c56c8574AA21a3"),
            playerSubscription: getAddress("0xC6409a0113cCF6c4194FBfD8C7409589465e15EC"),
            raceXp: getAddress("0x6B454a53581E3b1e93553485210A2172e4897FD0"),
            carCrusher: getAddress("0x5D9D43f6890868C88315411fd7B012b4194C96Ab"),
            jackpot: getAddress("0xeD548643332E019C97e3150736807839bf174dF9"),
            safehouse: getAddress("0x67336ec867c5631c08F1A536FAdF9DC489EeFf71"),
            detectiveAgency: getAddress("0xB31B9f5a9f99871B30956B96CcDEC275C48D84F1"),
            rankStake: getAddress("0xcecf804016bd0cfDEE8F506EA273c6E5D74f6699"),
            bodyguardTraining: getAddress("0x25d25524044A74eFe1Ff279abfe9708c69f5cbcE"),
            equipment: getAddress("0x37edFc50908e194f05912EA0BC812Cd2f1Eb5bE4"),
            mafia: getAddress("0xa27aDe5806Ded801b93499C6fA23cc8dC9AC55EA"),
            ogCrate: getAddress("0x3325E42aA71188939216b669E8d431718e5bd790"),
            map: getAddress("0xE571Aa670EDeEBd88887eb5687576199652A714F"),
            mafiaFamily: getAddress("0x3363cf983ae23AF2D95a81bA4A39C36084f8BEc4"),
            ocLobby: getAddress("0xE9680c72817477f9e51596bD39821C670790a66E"),
            ocJoin: getAddress("0xE79495F0982FCC3e884E5bCC2960D6d48439fCB6"),
            ocExecution: getAddress("0x7783e026416cF3B43046f3C2D45eFFa582bA2e91"),
            smuggleMarket: getAddress("0x9bf722B3350832ae9023B7C9762227bE33943d09"),
            storyMode: getAddress("0xaa4a6b620D869F05490A2DF6f43892d4664d2b7B"),
            weeklyMission: getAddress("0xCB8ab5f2A83F6Cd56d5aF97b3A6c942ab989fa25"),
            xpMarket: getAddress("0xc5731c6C3627F4912B54A2c6e13A8BFaeD69A39C"),
            inventoryMarketplace: getAddress("0x321e27aaB7e6F5DE221AE3eAe63306345f3A465d"),
            raceLobby: getAddress("0x10D0D93BD141a76F8cBcA1cd94CAf8081C5d0427"),
        },
    },
};

// Centralized contract addresses by chain (single source of truth).
export const CONTRACT_ADDRESSES: Record<ChainId, ChainConfig["addresses"]> = {
    bnb: CHAIN_CONFIGS.bnb.addresses,
    pulsechain: CHAIN_CONFIGS.pulsechain.addresses,
};

// ========== Exchange Contract (Convert Items) ==========
export const EXCHANGE_ADDRESSES: Record<ChainId, `0x${string}`> = {
    bnb: getAddress("0x605694A29c5258D6c7Aed642D01111c4b7036966"),
    pulsechain: getAddress("0x11ee2732eD4C6BFe673e7b4BE15ece35D6a8cCD7"),
};

export const DEPOSIT_ADDRESSES: Record<ChainId, `0x${string}`> = {
    bnb: getAddress("0xB081EC0763360a9Ad4D09AF2C9ec7DC1ED5190Ae"),
    pulsechain: getAddress("0xC9565b4f23C301Cf9f158D72A842BA6a53B84590"),
};

export const MAFIA_PAIR_ADDRESSES: Record<ChainId, `0x${string}`> = {
    bnb: getAddress("0xdE6e6378623C4F2c1102F2CcD35507d5bAf7924d"),
    pulsechain: getAddress("0x113bbdfea64b06aebe14a50e00c70149a32973ab"),
};
