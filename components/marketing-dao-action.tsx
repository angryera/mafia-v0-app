"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Vote,
  Users,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  PauseCircle,
  Loader2,
  Plus,
  Settings,
  ExternalLink,
  Trash2,
  Play,
  Square,
  Link2,
  Check,
} from "lucide-react";
import { useChain } from "@/components/chain-provider";
import { useAuth } from "@/components/auth-provider";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { useChainWriteContract } from "@/hooks/use-chain-write-contract";
import { cn } from "@/lib/utils";

// Format number with commas and optional decimals
function formatNumber(num: number, maxDecimals = 2): string {
  if (num === 0) return "0";
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(2).replace(/\.?0+$/, "") + "K";
  }
  return num.toLocaleString(undefined, { maximumFractionDigits: maxDecimals });
}
import { formatUnits, parseUnits, type Abi } from "viem";
import { toast } from "sonner";

// Contract addresses per chain
const MARKETING_DAO_ADDRESSES: Record<string, `0x${string}`> = {
  bnb: "0x727405987580B9C44052f8F1f82Fa268C966Ba09",
  pulsechain: "0x50ad97424d3e7Cf5F7D4B73b0F97AdE1f4e140eD",
};

// ABI for MafiaMarketingProposal contract
const MARKETING_DAO_ABI: Abi = [
  {
    type: "function",
    name: "mafia",
    inputs: [],
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getProposals",
    inputs: [],
    outputs: [
      {
        name: "proposals",
        type: "tuple[]",
        components: [
          { name: "id", type: "uint16" },
          { name: "status", type: "uint8" },
          { name: "optionCount", type: "uint8" },
          { name: "chosenOption", type: "uint8" },
          { name: "openedAt", type: "uint48" },
          { name: "closedAt", type: "uint48" },
          { name: "duration", type: "uint48" },
          { name: "totalUsers", type: "uint48" },
          { name: "totalMafia", type: "uint256" },
        ],
      },
      {
        name: "options",
        type: "tuple[][]",
        components: [
          { name: "title", type: "string" },
          { name: "delieveryLink", type: "string" },
          { name: "cost", type: "uint256" },
          { name: "adminFee", type: "uint256" },
        ],
      },
      { name: "voteWeights", type: "uint256[][]" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUserVotes",
    inputs: [
      { name: "user", type: "address" },
      { name: "ids", type: "uint16[]" },
      { name: "message", type: "string" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "optionId", type: "uint8" },
          { name: "isVoted", type: "bool" },
          { name: "isWithdrawn", type: "bool" },
          { name: "amount", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isAdmin",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "proposalIds",
    inputs: [],
    outputs: [{ name: "", type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "createProposal",
    inputs: [
      { name: "durationSeconds", type: "uint48" },
      {
        name: "options",
        type: "tuple[]",
        components: [
          { name: "title", type: "string" },
          { name: "delieveryLink", type: "string" },
          { name: "cost", type: "uint256" },
          { name: "adminFee", type: "uint256" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "openProposal",
    inputs: [{ name: "proposalId", type: "uint16" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "closeProposal",
    inputs: [{ name: "proposalId", type: "uint16" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "cancelProposal",
    inputs: [{ name: "proposalId", type: "uint16" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "voteOnProposal",
    inputs: [
      { name: "proposalId", type: "uint16" },
      { name: "optionId", type: "uint8" },
      { name: "amountWei", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawVoteToken",
    inputs: [{ name: "proposalId", type: "uint16" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateDelieveryLinks",
    inputs: [
      { name: "proposalId", type: "uint16" },
      { name: "optionIds", type: "uint8[]" },
      { name: "links", type: "string[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

// ERC20 ABI for MAFIA token
const ERC20_ABI: Abi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
];

// Types
interface Proposal {
  id: number;
  status: number;
  optionCount: number;
  chosenOption: number;
  openedAt: number;
  closedAt: number;
  duration: number;
  totalUsers: number;
  totalMafia: bigint;
}

interface ProposalOption {
  title: string;
  delieveryLink: string;
  cost: bigint;
  adminFee: bigint;
}

interface UserVote {
  optionId: number;
  isVoted: boolean;
  isWithdrawn: boolean;
  amount: bigint;
}

// Status mapping
const STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Opened",
  2: "Closed",
  3: "Canceled",
};

function getStatusDisplay(status: number, openedAt: number, duration: number, nowSeconds: number) {
  if (status === 2) return { label: "Completed", color: "text-green-500", icon: CheckCircle };
  if (status === 3) return { label: "Canceled", color: "text-red-500", icon: XCircle };
  if (status === 0) return { label: "Pending", color: "text-muted-foreground", icon: PauseCircle };
  
  // Opened
  const endTime = openedAt + duration;
  const timeLeft = endTime - nowSeconds;
  if (timeLeft > 0) {
    return { label: "In Progress", color: "text-blue-500", icon: Clock };
  }
  return { label: "Finished", color: "text-yellow-500", icon: Loader2 };
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "0:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatMafia(wei: bigint): string {
  const num = Number(formatUnits(wei, 18));
  return formatNumber(num);
}

function formatUsd(wei: bigint): string {
  const num = Number(formatUnits(wei, 18));
  return `$${formatNumber(num)}`;
}

// Create proposal modal
function CreateProposalModal({
  isOpen,
  onClose,
  contractAddress,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  contractAddress: `0x${string}`;
  onSuccess: () => void;
}) {
  const [duration, setDuration] = useState("7");
  const [options, setOptions] = useState([
    { title: "", delieveryLink: "", cost: "", adminFee: "" },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { writeContractAsync } = useChainWriteContract();

  const addOption = () => {
    setOptions([...options, { title: "", delieveryLink: "", cost: "", adminFee: "" }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 1) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, field: string, value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!duration || options.some((o) => !o.title)) {
      toast.error("Please fill in duration and at least titles for all options");
      return;
    }

    setIsSubmitting(true);
    try {
      const durationSeconds = BigInt(parseInt(duration) * 24 * 60 * 60);
      const formattedOptions = options.map((o) => ({
        title: o.title,
        delieveryLink: o.delieveryLink || "",
        cost: o.cost ? parseUnits(o.cost, 18) : BigInt(0),
        adminFee: o.adminFee ? parseUnits(o.adminFee, 18) : BigInt(0),
      }));

      await writeContractAsync({
        address: contractAddress,
        abi: MARKETING_DAO_ABI,
        functionName: "createProposal",
        args: [durationSeconds, formattedOptions],
      });

      toast.success("Proposal created successfully");
      onSuccess();
      onClose();
      setDuration("7");
      setOptions([{ title: "", delieveryLink: "", cost: "", adminFee: "" }]);
    } catch (err) {
      console.error("Create proposal error:", err);
      toast.error("Failed to create proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Proposal</DialogTitle>
          <DialogDescription>
            Create a new marketing proposal for the DAO to vote on.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (days)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="7"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="mr-1 h-3 w-3" />
                Add Option
              </Button>
            </div>

            {options.map((option, index) => (
              <Card key={index} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <Input
                      placeholder="Option title"
                      value={option.title}
                      onChange={(e) => updateOption(index, "title", e.target.value)}
                    />
                    <Input
                      placeholder="Delivery link (optional)"
                      value={option.delieveryLink}
                      onChange={(e) => updateOption(index, "delieveryLink", e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Cost (USD)"
                        type="number"
                        value={option.cost}
                        onChange={(e) => updateOption(index, "cost", e.target.value)}
                      />
                      <Input
                        placeholder="Admin fee (USD)"
                        type="number"
                        value={option.adminFee}
                        onChange={(e) => updateOption(index, "adminFee", e.target.value)}
                      />
                    </div>
                  </div>
                  {options.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Create Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Vote modal
function VoteModal({
  isOpen,
  onClose,
  proposal,
  option,
  optionIndex,
  contractAddress,
  mafiaAddress,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal | null;
  option: ProposalOption | null;
  optionIndex: number;
  contractAddress: `0x${string}`;
  mafiaAddress: `0x${string}` | undefined;
  onSuccess: () => void;
}) {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const { writeContractAsync } = useChainWriteContract();

  // Get user's MAFIA balance
  const { data: balance } = useReadContract({
    address: mafiaAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  }) as { data: bigint | undefined };

  // Get allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: mafiaAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, contractAddress] : undefined,
  }) as { data: bigint | undefined; refetch: () => void };

  const amountWei = amount ? parseUnits(amount, 18) : BigInt(0);
  const needsApproval = allowance !== undefined && amountWei > allowance;

  const handleApprove = async () => {
    if (!mafiaAddress) return;
    setIsApproving(true);
    try {
      await writeContractAsync({
        address: mafiaAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [contractAddress, amountWei],
      });
      toast.success("Approval successful");
      refetchAllowance();
    } catch (err) {
      console.error("Approve error:", err);
      toast.error("Approval failed");
    } finally {
      setIsApproving(false);
    }
  };

  const handleVote = async () => {
    if (!proposal) return;
    setIsVoting(true);
    try {
      await writeContractAsync({
        address: contractAddress,
        abi: MARKETING_DAO_ABI,
        functionName: "voteOnProposal",
        args: [proposal.id, optionIndex, amountWei],
      });
      toast.success("Vote submitted successfully");
      onSuccess();
      onClose();
      setAmount("");
    } catch (err) {
      console.error("Vote error:", err);
      toast.error("Vote failed");
    } finally {
      setIsVoting(false);
    }
  };

  if (!proposal || !option) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vote on Option</DialogTitle>
          <DialogDescription>
            Stake MAFIA tokens to vote for &quot;{option.title}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="vote-amount">Amount (MAFIA)</Label>
              {balance !== undefined && (
                <span className="text-xs text-muted-foreground">
                  Balance: {formatMafia(balance)}
                </span>
              )}
            </div>
            <Input
              id="vote-amount"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
            />
            {balance !== undefined && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setAmount(formatUnits(balance, 18))}
              >
                Max
              </Button>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isApproving || isVoting}>
            Cancel
          </Button>
          {needsApproval ? (
            <Button onClick={handleApprove} disabled={isApproving || !amount}>
              {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Approve MAFIA
            </Button>
          ) : (
            <Button onClick={handleVote} disabled={isVoting || !amount}>
              {isVoting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Vote
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Manage proposal modal
function ManageProposalModal({
  isOpen,
  onClose,
  proposal,
  options,
  contractAddress,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  proposal: Proposal | null;
  options: ProposalOption[];
  contractAddress: `0x${string}`;
  onSuccess: () => void;
}) {
  const [deliveryLinks, setDeliveryLinks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const { writeContractAsync } = useChainWriteContract();

  useEffect(() => {
    if (options) {
      setDeliveryLinks(options.map((o) => o.delieveryLink || ""));
    }
  }, [options]);

  const handleAction = async (actionType: "open" | "close" | "cancel") => {
    if (!proposal) return;
    setIsSubmitting(true);
    setAction(actionType);
    try {
      const functionName = actionType === "open" ? "openProposal" : 
                           actionType === "close" ? "closeProposal" : "cancelProposal";
      await writeContractAsync({
        address: contractAddress,
        abi: MARKETING_DAO_ABI,
        functionName,
        args: [proposal.id],
      });
      toast.success(`Proposal ${actionType}ed successfully`);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(`${actionType} proposal error:`, err);
      toast.error(`Failed to ${actionType} proposal`);
    } finally {
      setIsSubmitting(false);
      setAction(null);
    }
  };

  const handleUpdateLinks = async () => {
    if (!proposal) return;
    setIsSubmitting(true);
    setAction("links");
    try {
      const optionIds = options.map((_, i) => i);
      await writeContractAsync({
        address: contractAddress,
        abi: MARKETING_DAO_ABI,
        functionName: "updateDelieveryLinks",
        args: [proposal.id, optionIds, deliveryLinks],
      });
      toast.success("Delivery links updated");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Update links error:", err);
      toast.error("Failed to update delivery links");
    } finally {
      setIsSubmitting(false);
      setAction(null);
    }
  };

  if (!proposal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Round #{proposal.id + 1}</DialogTitle>
          <DialogDescription>
            Admin controls for this proposal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {proposal.status === 0 && (
              <Button
                onClick={() => handleAction("open")}
                disabled={isSubmitting}
                className="flex-1"
              >
                {action === "open" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Play className="mr-2 h-4 w-4" />
                Open Voting
              </Button>
            )}
            {proposal.status === 1 && (
              <Button
                onClick={() => handleAction("close")}
                disabled={isSubmitting}
                className="flex-1"
              >
                {action === "close" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Square className="mr-2 h-4 w-4" />
                Close Voting
              </Button>
            )}
            {(proposal.status === 0 || proposal.status === 1) && (
              <Button
                variant="destructive"
                onClick={() => handleAction("cancel")}
                disabled={isSubmitting}
                className="flex-1"
              >
                {action === "cancel" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
          </div>

          {/* Delivery links */}
          <div className="space-y-3">
            <Label>Delivery Links</Label>
            {options.map((option, index) => (
              <div key={index} className="space-y-1">
                <span className="text-xs text-muted-foreground">{option.title}</span>
                <Input
                  placeholder="Delivery URL"
                  value={deliveryLinks[index] || ""}
                  onChange={(e) => {
                    const newLinks = [...deliveryLinks];
                    newLinks[index] = e.target.value;
                    setDeliveryLinks(newLinks);
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline"
              onClick={handleUpdateLinks}
              disabled={isSubmitting}
              className="w-full"
            >
              {action === "links" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Link2 className="mr-2 h-4 w-4" />
              Update Delivery Links
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main component
export function MarketingDaoAction() {
  const { chainConfig } = useChain();
  const { address, isConnected } = useAccount();
  const { authData } = useAuth();
  const { writeContractAsync } = useChainWriteContract();
  
  const contractAddress = MARKETING_DAO_ADDRESSES[chainConfig.id] as `0x${string}`;
  
  // Countdown state
  const [nowSeconds, setNowSeconds] = useState(Math.floor(Date.now() / 1000));
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [selectedOption, setSelectedOption] = useState<ProposalOption | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  
  // Withdrawing state
  const [withdrawingId, setWithdrawingId] = useState<number | null>(null);

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNowSeconds(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch MAFIA token address
  const { data: mafiaAddress } = useReadContract({
    address: contractAddress,
    abi: MARKETING_DAO_ABI,
    functionName: "mafia",
  }) as { data: `0x${string}` | undefined };

  // Check if user is admin
  const { data: isAdmin } = useReadContract({
    address: contractAddress,
    abi: MARKETING_DAO_ABI,
    functionName: "isAdmin",
    args: address ? [address] : undefined,
  }) as { data: boolean | undefined };

  // Fetch proposals
  const {
    data: proposalsData,
    isLoading: isLoadingProposals,
    refetch: refetchProposals,
  } = useReadContract({
    address: contractAddress,
    abi: MARKETING_DAO_ABI,
    functionName: "getProposals",
  }) as {
    data: [Proposal[], ProposalOption[][], bigint[][]] | undefined;
    isLoading: boolean;
    refetch: () => void;
  };

  const proposals = proposalsData?.[0] ?? [];
  const allOptions = proposalsData?.[1] ?? [];
  const voteWeights = proposalsData?.[2] ?? [];

  // Get completed proposal IDs (Opened, Closed, Canceled) for user votes
  const completedIds = useMemo(() => {
    return proposals
      .filter((p) => p.status >= 1)
      .map((p) => p.id);
  }, [proposals]);

  // Fetch user votes
  const { data: userVotes, refetch: refetchUserVotes } = useReadContract({
    address: contractAddress,
    abi: MARKETING_DAO_ABI,
    functionName: "getUserVotes",
    args: address && authData && completedIds.length > 0
      ? [address, completedIds, authData.message, authData.signature]
      : undefined,
  }) as { data: UserVote[] | undefined; refetch: () => void };

  // Create a map of proposalId -> userVote
  const userVoteMap = useMemo(() => {
    const map = new Map<number, UserVote>();
    if (userVotes && completedIds.length === userVotes.length) {
      completedIds.forEach((id, index) => {
        map.set(id, userVotes[index]);
      });
    }
    return map;
  }, [userVotes, completedIds]);

  const handleRefresh = () => {
    refetchProposals();
    refetchUserVotes();
  };

  const handleVoteClick = (proposal: Proposal, option: ProposalOption, optionIndex: number) => {
    setSelectedProposal(proposal);
    setSelectedOption(option);
    setSelectedOptionIndex(optionIndex);
    setShowVoteModal(true);
  };

  const handleManageClick = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setShowManageModal(true);
  };

  const handleWithdraw = async (proposalId: number) => {
    setWithdrawingId(proposalId);
    try {
      await writeContractAsync({
        address: contractAddress,
        abi: MARKETING_DAO_ABI,
        functionName: "withdrawVoteToken",
        args: [proposalId],
      });
      toast.success("Tokens withdrawn successfully");
      handleRefresh();
    } catch (err) {
      console.error("Withdraw error:", err);
      toast.error("Failed to withdraw tokens");
    } finally {
      setWithdrawingId(null);
    }
  };

  // Sort proposals by id descending (newest first)
  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => b.id - a.id);
  }, [proposals]);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Vote className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Marketing Proposals</h3>
                <p className="text-xs text-muted-foreground">
                  {proposals.length} total proposals
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Proposal
                </Button>
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isLoadingProposals}
              >
                <RefreshCw className={cn("h-4 w-4", isLoadingProposals && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isLoadingProposals && proposals.length === 0 && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {/* Proposals list */}
      {sortedProposals.map((proposal) => {
        const options = allOptions[proposal.id] ?? [];
        const weights = voteWeights[proposal.id] ?? [];
        const userVote = userVoteMap.get(proposal.id);
        const statusDisplay = getStatusDisplay(
          proposal.status,
          proposal.openedAt,
          proposal.duration,
          nowSeconds
        );
        const StatusIcon = statusDisplay.icon;
        const timeLeft = proposal.openedAt + proposal.duration - nowSeconds;

        return (
          <Card key={proposal.id} className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
            <Accordion type="single" collapsible>
              <AccordionItem value="details" className="border-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/30 [&[data-state=open]]:bg-secondary/20">
                  <div className="flex items-center justify-between w-full pr-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Vote className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Round #{proposal.id + 1}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              statusDisplay.color,
                              statusDisplay.label === "Completed" && "border-green-500/50 bg-green-500/10",
                              statusDisplay.label === "Canceled" && "border-red-500/50 bg-red-500/10",
                              statusDisplay.label === "In Progress" && "border-blue-500/50 bg-blue-500/10",
                              statusDisplay.label === "Finished" && "border-yellow-500/50 bg-yellow-500/10",
                              statusDisplay.label === "Pending" && "border-muted-foreground/50"
                            )}
                          >
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {statusDisplay.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {proposal.totalUsers} participants
                          </span>
                          <span className="text-border">|</span>
                          <span>{formatMafia(proposal.totalMafia)} voted</span>
                          {proposal.status === 1 && timeLeft > 0 && (
                            <>
                              <span className="text-border">|</span>
                              <span className="flex items-center gap-1 text-blue-400">
                                <Clock className="h-3 w-3" />
                                {formatCountdown(timeLeft)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mr-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleManageClick(proposal);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Option</TableHead>
                        <TableHead>Voting</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead>Admin Fee</TableHead>
                        <TableHead>Delivery</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {options.map((option, optionIndex) => {
                        const weight = weights[optionIndex] ?? BigInt(0);
                        const percentage =
                          proposal.totalMafia > BigInt(0)
                            ? Number((weight * BigInt(100)) / proposal.totalMafia)
                            : 0;
                        const isWinner =
                          proposal.status === 2 && proposal.chosenOption === optionIndex;
                        const canVote =
                          proposal.status === 1 &&
                          authData &&
                          userVote &&
                          !userVote.isVoted;
                        const canWithdraw =
                          (proposal.status === 2 || proposal.status === 3) &&
                          userVote &&
                          userVote.isVoted &&
                          !userVote.isWithdrawn &&
                          userVote.optionId === optionIndex;

                        return (
                          <TableRow
                            key={optionIndex}
                            className={cn(isWinner && "bg-green-500/5")}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {option.title}
                                {isWinner && (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Progress value={percentage} className="h-2 w-24" />
                                <span className="text-xs text-muted-foreground">
                                  {percentage.toFixed(1)}% ({formatMafia(weight)})
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{formatUsd(option.cost)}</TableCell>
                            <TableCell>{formatUsd(option.adminFee)}</TableCell>
                            <TableCell>
                              {option.delieveryLink ? (
                                <a
                                  href={option.delieveryLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-primary hover:underline"
                                >
                                  <Check className="h-3 w-3 text-green-500" />
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {canVote && (
                                <Button
                                  size="sm"
                                  onClick={() => handleVoteClick(proposal, option, optionIndex)}
                                >
                                  Vote
                                </Button>
                              )}
                              {canWithdraw && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleWithdraw(proposal.id)}
                                  disabled={withdrawingId === proposal.id}
                                >
                                  {withdrawingId === proposal.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Withdraw"
                                  )}
                                </Button>
                              )}
                              {userVote?.isVoted &&
                                userVote.optionId === optionIndex &&
                                userVote.isWithdrawn && (
                                  <Badge variant="outline" className="text-xs">
                                    Withdrawn
                                  </Badge>
                                )}
                              {userVote?.isVoted &&
                                userVote.optionId === optionIndex &&
                                !userVote.isWithdrawn &&
                                (proposal.status === 2 || proposal.status === 3) === false && (
                                  <Badge variant="outline" className="text-xs text-primary">
                                    Your vote: {formatMafia(userVote.amount)}
                                  </Badge>
                                )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Card>
        );
      })}

      {/* Empty state */}
      {!isLoadingProposals && proposals.length === 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Vote className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No Proposals Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {isAdmin
                ? "Create the first marketing proposal for the DAO."
                : "Check back later for voting opportunities."}
            </p>
            {isAdmin && (
              <Button onClick={() => setShowCreateModal(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Proposal
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Not connected state */}
      {!isConnected && (
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">
              Connect your wallet to participate in voting.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <CreateProposalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        contractAddress={contractAddress}
        onSuccess={handleRefresh}
      />

      <VoteModal
        isOpen={showVoteModal}
        onClose={() => setShowVoteModal(false)}
        proposal={selectedProposal}
        option={selectedOption}
        optionIndex={selectedOptionIndex}
        contractAddress={contractAddress}
        mafiaAddress={mafiaAddress}
        onSuccess={handleRefresh}
      />

      <ManageProposalModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        proposal={selectedProposal}
        options={selectedProposal ? allOptions[selectedProposal.id] ?? [] : []}
        contractAddress={contractAddress}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
