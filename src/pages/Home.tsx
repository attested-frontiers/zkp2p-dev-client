import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { browserName } from 'react-device-detect';
import { ThemedText } from '@theme/text';
import { colors } from '@theme/colors';
import { Button } from '@components/common/Button';
import { Input } from '@components/common/Input';
import useExtensionProxyProofs from '@hooks/contexts/useExtensionProxyProofs';
import { ExtensionRequestMetadata, ProofGenerationStatusType } from '@helpers/types';
import { DEV_ACCOUNTS, DEV_ADDRESSES } from '@helpers/constants';
import chromeSvg from '../assets/images/browsers/chrome.svg';
import braveSvg from '../assets/images/browsers/brave.svg';
import { AccessoryButton } from '@components/common/AccessoryButton';
import Spinner from '@components/common/Spinner';
import { ChevronRight, RefreshCw } from 'react-feather';
import { useEthersBalance } from '@hooks/useEthersBalance';
import { useSendUsdc } from '../hooks/useSendUsdc';
import { useCreateDeposit } from '../hooks/useCreateDeposit';
import { useApproveERC20 } from '@hooks/useApproveERC20';
import { ethers } from 'ethers';
import useGetDeposits from '@hooks/useGetDeposits';
import useSignalIntent from '../hooks/useSignalIntent';
import useGetAccountIntents from '../hooks/useGetAccountIntents';
import { useFulfillIntent } from '../hooks/useFulfillIntent';

const CHROME_EXTENSION_URL = 'https://chromewebstore.google.com/detail/zkp2p-extension/ijpgccednehjpeclfcllnjjcmiohdjih';
const PROOF_FETCH_INTERVAL = 3000;
const PROOF_GENERATION_TIMEOUT = 60000;

const Home: React.FC = () => {
  const [intentHash, setIntentHash] = useState(() => {
    return localStorage.getItem('intentHash') || '0x0000000000000000000000000000000000000000000000000000000000000000';
  });
  const [actionType, setActionType] = useState(() => {
    return localStorage.getItem('actionType') || 'transfer_venmo';
  });
  const [paymentPlatform, setPaymentPlatform] = useState(() => {
    return localStorage.getItem('paymentPlatform') || 'venmo';
  });
  const [metadataPlatform, setMetadataPlatform] = useState(() => {
    const initialStoredPaymentPlatform = localStorage.getItem('paymentPlatform') || 'venmo';
    const storedMetadataVal = localStorage.getItem('metadataPlatform');
    if (storedMetadataVal === null) {
      return initialStoredPaymentPlatform;
    }
    return storedMetadataVal;
  });
  const [proofIndex, setProofIndex] = useState<number>(0);
  const [isInstallClicked, setIsInstallClicked] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<keyof typeof DEV_ACCOUNTS>(() => {
    return (localStorage.getItem('selectedAccount') as keyof typeof DEV_ACCOUNTS) || 'alice';
  });
  const [selectedRecipient, setSelectedRecipient] = useState<keyof typeof DEV_ACCOUNTS>(() => {
    return (localStorage.getItem('selectedRecipient') as keyof typeof DEV_ACCOUNTS) || 'bob';
  });

  const [selectedMetadata, setSelectedMetadata] =
    useState<ExtensionRequestMetadata | null>(null);
  const [proofStatus, setProofStatus] = useState<ProofGenerationStatusType>('idle');
  const [resultProof, setResultProof] = useState('');

  const [triggerProofFetchPolling, setTriggerProofFetchPolling] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const proofTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    isSidebarInstalled,
    sideBarVersion,
    refetchExtensionVersion,
    openNewTab,
    openSidebar,
    platformMetadata,
    paymentProof,
    generatePaymentProof,
    fetchPaymentProof,
    resetProofState,
  } = useExtensionProxyProofs();

  const {
    balance,
    loading: balanceLoading,
    error: balanceError,
    refreshBalance,
    walletAddress,
    isConnected,
  } = useEthersBalance(selectedAccount);

  const { sendUsdc, loading: sendLoading, error: sendError } = useSendUsdc(selectedAccount);
  const { createDeposit, loading: depositLoading, error: depositError } = useCreateDeposit(selectedAccount);
  const { approveERC20, loading: approveLoading, error: approveError } = useApproveERC20(selectedAccount);

  const { signalIntent, loading: signalLoading, error: signalError } = useSignalIntent(selectedAccount);

  const { intents, loading: intentsLoading, error: intentsError } = useGetAccountIntents(selectedAccount);

  const { fulfillIntent, loading: fulfillLoading, error: fulfillError } = useFulfillIntent(selectedAccount);

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [tokenAmount, setTokenAmount] = useState('');
  const [receiveTo, setReceiveTo] = useState('');
  const [intentAmount, setIntentAmount] = useState('');

  const deposits = useGetDeposits();

  useEffect(() => {
    refetchExtensionVersion();
  }, [refetchExtensionVersion]);

  useEffect(() => {
    localStorage.setItem('intentHash', intentHash);
  }, [intentHash]);

  useEffect(() => {
    localStorage.setItem('actionType', actionType);
  }, [actionType]);

  useEffect(() => {
    localStorage.setItem('paymentPlatform', paymentPlatform);
  }, [paymentPlatform]);

  useEffect(() => {
    const storedMetadataVal = localStorage.getItem('metadataPlatform');
    if (storedMetadataVal === null) {
      setMetadataPlatform(paymentPlatform);
    }
  }, [paymentPlatform]);

  useEffect(() => {
    if (!paymentProof) return;
    if (paymentProof.status === 'success') {
      setProofStatus('success');
      setResultProof(JSON.stringify(paymentProof.proof, null, 2));
      setTriggerProofFetchPolling(false);
    } else if (paymentProof.status === 'error') {
      setProofStatus('error');
      setResultProof(JSON.stringify(paymentProof.proof, null, 2));
      setTriggerProofFetchPolling(false);
    } else {
      // keep status "generating"
      setProofStatus('generating');
    }
  }, [paymentProof]);

  useEffect(() => {
    if (triggerProofFetchPolling && paymentPlatform) {
      if (intervalId) clearInterval(intervalId);
      const id = setInterval(() => {
        fetchPaymentProof(paymentPlatform);
      }, PROOF_FETCH_INTERVAL);
      setIntervalId(id);

      proofTimeoutRef.current = setTimeout(() => {
        clearInterval(id);
        setTriggerProofFetchPolling(false);
        setProofStatus('timeout');
      }, PROOF_GENERATION_TIMEOUT);

      return () => {
        clearInterval(id);
        if (proofTimeoutRef.current) clearTimeout(proofTimeoutRef.current);
      };
    }
  },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [triggerProofFetchPolling, paymentPlatform, fetchPaymentProof]
  );

  useEffect(() => {
    if (proofStatus !== 'generating' && intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
      setTriggerProofFetchPolling(false);
      if (proofTimeoutRef.current) {
        clearTimeout(proofTimeoutRef.current);
        proofTimeoutRef.current = null;
      }
    }
  }, [proofStatus, intervalId]);

  const handleInstall = () => {
    window.open(CHROME_EXTENSION_URL, '_blank');
    setIsInstallClicked(true);
  };

  const handleMetadataPlatformChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setMetadataPlatform(newValue);
    localStorage.setItem('metadataPlatform', newValue);
  };

  const handleOpenSettings = () => {
    openSidebar('/settings');
  };

  const handleAuthenticate = () => {
    if (!intentHash || !actionType || !paymentPlatform) {
      alert('Please fill out all fields');
      return;
    }
    openNewTab(actionType, paymentPlatform);
    setSelectedMetadata(null);
    setProofStatus('idle');
    setResultProof('');
  };

  const handleGenerateProof = (meta: ExtensionRequestMetadata) => {
    setSelectedMetadata(meta);
    setProofStatus('generating');
    setResultProof('');

    setTriggerProofFetchPolling(false);
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    if (proofTimeoutRef.current) {
      clearTimeout(proofTimeoutRef.current);
      proofTimeoutRef.current = null;
    }

    resetProofState();
    generatePaymentProof(metadataPlatform, intentHash, meta.originalIndex, proofIndex);

    setTriggerProofFetchPolling(true);
  };

  const handleSendUsdc = async () => {
    if (!selectedRecipient || !tokenAmount) {
      alert('Please select a recipient and enter a valid token amount');
      return;
    }

    const recipientAddress = DEV_ACCOUNTS[selectedRecipient].pub;
    const amount = Number(tokenAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid token amount');
      return;
    }

    const result = await sendUsdc(recipientAddress, amount);
    if (result.success) {
      alert('USDC sent successfully!');
    } else {
      alert(`Failed to send USDC: ${result.error}`);
    }
  };

  const handleCreateDeposit = async () => {
    if (!tokenAmount || !receiveTo) {
      alert('Please enter a valid deposit amount and recipient address');
      return;
    }

    const amount = Number(tokenAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid deposit amount');
      return;
    }

    const result = await createDeposit(amount, receiveTo);
    if (result.success) {
      alert('Deposit created successfully!');
    } else {
      alert(`Failed to create deposit: ${result.error}`);
    }
  };

  const handleApproveERC20 = async () => {
    const amount = 10000000; // Fixed approval amount

    const result = await approveERC20(DEV_ADDRESSES.Escrow, amount);
    if (result.success) {
      alert('USDC approval successful!');
    } else {
      alert(`Failed to approve USDC: ${result.error}`);
    }
  };

  const handleSignalIntent = async (depositId: string, amount: number) => {
    try {
      const result = await signalIntent(depositId, amount);
      if (result.success) {
        alert('Intent signaled successfully!');
      } else {
        alert(`Failed to signal intent: ${result.error}`);
      }
    } catch {
      alert(`Failed to signal intent`);
    }
  };

  const handleFulfillIntent = async (intentHash: string) => {
    const result = await fulfillIntent(intentHash, resultProof);

    if (result.success) {
      alert('Intent fulfilled successfully!');
    } else {
      alert(`Failed to fulfill intent: ${result.error}`);
    }
  };

  const browserSvgIcon = () =>
    browserName === 'Brave' ? braveSvg : chromeSvg;
  const addToBrowserText = () =>
    browserName === 'Brave' ? 'Add to Brave' : 'Add to Chrome';

  return (
    <PageWrapper>
      <TopRow>
        <LeftPanel>
          <Section>
            <StatusItem>
              <StatusLabel>Version:</StatusLabel>
              <StatusValue>
                {isSidebarInstalled ? sideBarVersion : 'Not Installed'}
              </StatusValue>
              <IconButton
                onClick={handleOpenSettings}
                disabled={proofStatus === 'generating'}
                title="Open Settings"
              >
                Open Settings
                <StyledChevronRight />
              </IconButton>
            </StatusItem>
            <Input
              label="Intent Hash"
              name="intentHash"
              value={intentHash}
              onChange={(e) => setIntentHash(e.target.value)}
              valueFontSize="16px"
            />
            <Input
              label="Action Type"
              name="actionType"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              valueFontSize="16px"
            />
            <Input
              label="Payment Platform"
              name="paymentPlatform"
              value={paymentPlatform}
              onChange={(e) => setPaymentPlatform(e.target.value)}
              valueFontSize="16px"
            />
            <AdvancedSection>
              <AdvancedHeader onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}>
                <ThemedText.BodySmall>Advanced Settings</ThemedText.BodySmall>
                <ChevronRight
                  size={16}
                  style={{
                    transform: isAdvancedOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                />
              </AdvancedHeader>
              {isAdvancedOpen && (
                <AdvancedContent>
                  <Input
                    label="Metadata Group (e.g. zelle)"
                    name="metadataPlatform"
                    value={metadataPlatform}
                    onChange={handleMetadataPlatformChange}
                    valueFontSize="16px"
                  />
                  <Input
                    label="Proof Index"
                    name="proofIndex"
                    value={proofIndex.toString()}
                    onChange={(e) => setProofIndex(Number(e.target.value))}
                    valueFontSize="16px"
                  />
                </AdvancedContent>
              )}
            </AdvancedSection>
            <ButtonContainer>
              {isSidebarInstalled ? (
                <Button
                  onClick={handleAuthenticate}
                  height={48}
                  width={216}
                  disabled={!isSidebarInstalled}
                >
                  Authenticate
                </Button>
              ) : (
                <Button
                  onClick={handleInstall}
                  leftAccessorySvg={browserSvgIcon()}
                  loading={isInstallClicked}
                  disabled={isInstallClicked}
                  height={48}
                  width={216}
                >
                  {addToBrowserText()}
                </Button>
              )}
            </ButtonContainer>
          </Section>
        </LeftPanel>

        <MiddlePanel>
          <Section>
            <StatusItem>
              <StatusLabel>Available Metadata</StatusLabel>
            </StatusItem>
            {platformMetadata[metadataPlatform]?.metadata ? (
              <MetadataList>
                {platformMetadata[metadataPlatform].metadata.map(
                  (m, idx) => (
                    <MetadataItem
                      key={idx}
                      selected={
                        selectedMetadata?.originalIndex === m.originalIndex
                      }
                    >
                      <MetadataInfo>
                        <ThemedText.BodySmall>
                          Amount: {m.amount || 'N/A'}
                        </ThemedText.BodySmall>
                        <ThemedText.BodySmall>
                          Date: {m.date || 'N/A'}
                        </ThemedText.BodySmall>
                        <ThemedText.BodySmall>
                          Recipient: {m.recipient || 'N/A'}
                        </ThemedText.BodySmall>
                        <ThemedText.BodySmall>
                          Index: {m.originalIndex}
                        </ThemedText.BodySmall>
                      </MetadataInfo>
                      <AccessoryButton
                        onClick={() => handleGenerateProof(m)}
                        icon="chevronRight"
                        disabled={
                          selectedMetadata?.originalIndex === m.originalIndex &&
                          proofStatus === 'generating'
                        }
                      >
                        Prove
                      </AccessoryButton>
                    </MetadataItem>
                  )
                )}
              </MetadataList>
            ) : (
              <EmptyStateContainer>
                <EmptyStateMessage>
                  Authenticate to see available metadata
                </EmptyStateMessage>
              </EmptyStateContainer>
            )}
          </Section>
        </MiddlePanel>

        <RightPanel>
          <Section>
            <StatusItem>
              <StatusLabel>Proof Status</StatusLabel>
            </StatusItem>
            {proofStatus !== 'idle' ? (
              <ProofContainer>
                {proofStatus === 'generating' && (
                  <SpinnerContainer>
                    <Spinner color={colors.defaultBorderColor} size={40} />
                    <SpinnerMessage>
                      Generating zero-knowledge proof...
                      <br />
                      This may take up to 30 seconds
                    </SpinnerMessage>
                  </SpinnerContainer>
                )}
                {(proofStatus === 'success' || proofStatus === 'error') && (
                  <>
                    <ThemedText.BodySecondary>
                      {proofStatus === 'success'
                        ? '👍 Proof generated!'
                        : <>
                          Error generating proof: {' '}
                          <ErrorMessage>
                            {paymentProof?.error.message}
                          </ErrorMessage>
                        </>
                      }
                    </ThemedText.BodySecondary>
                    <ProofTextArea readOnly value={resultProof} />
                  </>
                )}
                {proofStatus === 'timeout' && (
                  <ThemedText.LabelSmall>
                    ⏱ Timeout: no proof received.
                  </ThemedText.LabelSmall>
                )}
              </ProofContainer>
            ) : (
              <EmptyStateContainer>
                <EmptyStateMessage>
                  Select metadata and generate a proof to see results here
                </EmptyStateMessage>
              </EmptyStateContainer>
            )}
          </Section>
        </RightPanel>
      </TopRow>

      <BottomRow>
        <AccountPanel>
          <Section>
            <StatusItem>
              <StatusLabel>Account & Balance</StatusLabel>
            </StatusItem>
            {/* Account selection dropdown */}
            <div style={{ marginBottom: '12px' }}>
              <label htmlFor="account-select" style={{ marginRight: 8 }}>Select Account:</label>
              <select
                id="account-select"
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value as keyof typeof DEV_ACCOUNTS)}
                style={{ padding: '4px 8px', borderRadius: 4 }}
              >
                {Object.keys(DEV_ACCOUNTS).map((acct) => (
                  <option key={acct} value={acct}>{acct.charAt(0).toUpperCase() + acct.slice(1)}</option>
                ))}
              </select>
            </div>
            <BalanceSection>
              <BalanceHeader>
                <ThemedText.BodySmall style={{ fontWeight: 'bold' }}>
                  {selectedAccount.charAt(0).toUpperCase() + selectedAccount.slice(1)}'s USDC Balance
                </ThemedText.BodySmall>
                <RefreshButton
                  onClick={refreshBalance}
                  disabled={balanceLoading}
                  title="Refresh Balance"
                >
                  <RefreshCw
                    size={16}
                    style={{
                      animation: balanceLoading ? 'spin 1s linear infinite' : 'none'
                    }}
                  />
                </RefreshButton>
              </BalanceHeader>

              <BalanceInfo>
                <BalanceItem>
                  <BalanceLabel>Address:</BalanceLabel>
                  <BalanceValue>
                    {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not connected'}
                  </BalanceValue>
                </BalanceItem>

                <BalanceItem>
                  <BalanceLabel>Balance:</BalanceLabel>
                  <BalanceValue>
                    {balanceLoading ? (
                      <Spinner color={colors.defaultBorderColor} size={16} />
                    ) : balanceError ? (
                      <ErrorText>{balanceError}</ErrorText>
                    ) : (
                      `${parseFloat(balance).toFixed(4)} USDC`
                    )}
                  </BalanceValue>
                </BalanceItem>

                <BalanceItem>
                  <BalanceLabel>Status:</BalanceLabel>
                  <StatusIndicator connected={isConnected}>
                    {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                  </StatusIndicator>
                </BalanceItem>
              </BalanceInfo>
            </BalanceSection>
            {/* Send Tokens section */}
            <div style={{ marginTop: '24px', padding: '16px', border: `1px solid ${colors.defaultBorderColor}`, borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
              <ThemedText.BodySmall style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Send Tokens
              </ThemedText.BodySmall>
              {/* Recipient selection dropdown */}
              <div style={{ marginBottom: '12px' }}>
                <label htmlFor="recipient-select" style={{ marginRight: 8 }}>Select Recipient:</label>
                <select
                  id="recipient-select"
                  value={selectedRecipient}
                  onChange={e => setSelectedRecipient(e.target.value as keyof typeof DEV_ACCOUNTS)}
                  style={{ padding: '4px 8px', borderRadius: 4 }}
                >
                  {Object.keys(DEV_ACCOUNTS).map((acct) => (
                    <option key={acct} value={acct}>{acct.charAt(0).toUpperCase() + acct.slice(1)}</option>
                  ))}
                </select>
              </div>
              {/* Input for token amount */}
              <div style={{ marginBottom: '12px' }}>
                <label htmlFor="token-amount" style={{ marginRight: 8 }}>Token Amount:</label>
                <input
                  id="token-amount"
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 4, width: '100%' }}
                />
              </div>
              {/* Send button */}
              <div style={{ marginTop: '12px' }}>
                <button
                  onClick={handleSendUsdc}
                  disabled={sendLoading}
                  style={{ padding: '8px 16px', borderRadius: 4, backgroundColor: '#007BFF', color: '#FFF', border: 'none', cursor: 'pointer' }}
                >
                  {sendLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
            {/* Approve USDC button */}
            <div style={{ marginTop: '12px' }}>
              <button
                onClick={handleApproveERC20}
                disabled={approveLoading}
                style={{ padding: '8px 16px', borderRadius: 4, backgroundColor: '#007BFF', color: '#FFF', border: 'none', cursor: 'pointer' }}
              >
                {approveLoading ? 'Approving...' : 'Approve USDC'}
              </button>
            </div>
          </Section>
        </AccountPanel>

        <PlaceholderPanel>
          <Section>
            <StatusItem>
              <StatusLabel>Deposits</StatusLabel>
            </StatusItem>
            <div style={{ marginTop: '24px', padding: '16px', border: `1px solid ${colors.defaultBorderColor}`, borderRadius: 8, background: 'rgba(0,0,0,0.02)' }}>
              <ThemedText.BodySmall style={{ fontWeight: 'bold', marginBottom: 8 }}>
                Create Deposit
              </ThemedText.BodySmall>
              <div style={{ marginBottom: '12px' }}>
                <label htmlFor="deposit-amount" style={{ marginRight: 8 }}>Deposit Amount:</label>
                <input
                  id="deposit-amount"
                  type="number"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 4, width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label htmlFor="receive-to" style={{ marginRight: 8 }}>Receive To:</label>
                <input
                  id="receive-to"
                  type="text"
                  value={receiveTo}
                  onChange={(e) => setReceiveTo(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: 4, width: '100%' }}
                />
              </div>
              <div style={{ marginTop: '12px' }}>
                <button
                  onClick={handleCreateDeposit}
                  disabled={depositLoading}
                  style={{ padding: '8px 16px', borderRadius: 4, backgroundColor: '#007BFF', color: '#FFF', border: 'none', cursor: 'pointer' }}
                >
                  {depositLoading ? 'Creating...' : 'Create Deposit'}
                </button>
              </div>
            </div>
            {/* Render deposits */}
            <div style={{ marginTop: '24px' }}>
              {deposits.map((deposit: { name: string; deposits: any[] }) => (
                <MetadataItem key={deposit.name} selected={false}>
                  <MetadataInfo>
                    <ThemedText.BodySmall>
                      Name: {deposit.name}
                    </ThemedText.BodySmall>
                    {deposit.deposits.map((d: any, index: number) => (
                      <div key={index}>
                        <ThemedText.BodySmall>
                          ID: {d[0].toString()}
                        </ThemedText.BodySmall>
                        <ThemedText.BodySmall>
                          Liquidity: {(Number(d[2].toString()) / 1e6).toFixed(6)}
                        </ThemedText.BodySmall>
                        <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                          <input
                            type="number"
                            placeholder="Enter intent"
                            style={{ padding: '4px 8px', borderRadius: 4, marginRight: '8px' }}
                            onChange={(e) => setIntentAmount(e.target.value)}
                          />
                          <button
                            style={{ padding: '8px 16px', borderRadius: 4, backgroundColor: '#007BFF', color: '#FFF', border: 'none', cursor: 'pointer' }}
                            onClick={() => handleSignalIntent(d[0].toString(), Number(intentAmount))}
                            disabled={signalLoading}
                          >
                            {signalLoading ? 'Signaling...' : 'Signal Intent'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </MetadataInfo>
                </MetadataItem>
              ))}
            </div>
          </Section>
        </PlaceholderPanel>

        <RightPanel>
          <Section>
            <StatusItem>
              <StatusLabel>Intents</StatusLabel>
            </StatusItem>
            {intentsLoading ? (
              <Spinner color={colors.defaultBorderColor} size={40} />
            ) : intentsError ? (
              <ErrorText>{intentsError}</ErrorText>
            ) : intents ? (
              <MetadataItem key={intents.intentHash} selected={false}>
                <MetadataInfo>
                  <ThemedText.BodySmall>ID: {intents.intentHash}</ThemedText.BodySmall>
                  <ThemedText.BodySmall>Amount: {intents.amount}</ThemedText.BodySmall>
                </MetadataInfo>
                <button
                  style={{ padding: '8px 16px', borderRadius: 4, backgroundColor: '#007BFF', color: '#FFF', border: 'none', cursor: 'pointer' }}
                  onClick={() => handleFulfillIntent(intents.intentHash)}
                  disabled={fulfillLoading}
                >
                  {fulfillLoading ? 'Fulfilling...' : 'Fulfill Intent'}
                </button>
              </MetadataItem>
            ) : (
              <EmptyStateMessage>No intents found</EmptyStateMessage>
            )}
          </Section>
        </RightPanel>
      </BottomRow>
    </PageWrapper>
  );
};

// Styled Components
const PageWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem;
  gap: 1rem;
`;

const TopRow = styled.div`
  display: flex;
  width: 100%;
  max-width: 1400px;
  border-radius: 8px;
  border: 1px solid ${colors.defaultBorderColor};
  overflow: hidden;
  background: ${colors.container};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const BottomRow = styled.div`
  display: flex;
  width: 100%;
  max-width: 1400px;
  border-radius: 8px;
  border: 1px solid ${colors.defaultBorderColor};
  overflow: hidden;
  background: ${colors.container};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const AppContainer = styled.div`
  display: flex;
  width: 100%;
  max-width: 1400px;
  border-radius: 8px;
  border: 1px solid ${colors.defaultBorderColor};
  overflow: hidden;
  background: ${colors.container};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const LeftPanel = styled.div`
  flex: 1;
  max-width: 340px;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid ${colors.defaultBorderColor};
  
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
    border-radius: 20px;
  }
`;

const MiddlePanel = styled.div`
  flex: 1.2;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid ${colors.defaultBorderColor};
  
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
    border-radius: 20px;
  }
`;

const RightPanel = styled.div`
  flex: 2;
  padding: 20px;
  overflow-y: auto;
  
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
    border-radius: 20px;
  }
`;

const AccountPanel = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid ${colors.defaultBorderColor};
  
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
    border-radius: 20px;
  }
`;

const PlaceholderPanel = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  border-right: 1px solid ${colors.defaultBorderColor};
  
  &:last-child {
    border-right: none;
  }
  
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
    border-radius: 20px;
  }
`;

const Section = styled.div`
  padding: 10px;
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
`;

const StatusLabel = styled.div`
  font-weight: bold;
  margin-right: 10px;
`;

const StatusValue = styled.div`
  color: ${colors.connectionStatusGreen};
  margin-right: auto;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: 5px;
`;

const MetadataList = styled.div`
  max-height: 600px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
    border-radius: 20px;
  }
`;

const MetadataItem = styled.div<{ selected: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border: 1px solid
    ${(p) =>
    p.selected
      ? colors.selectorHoverBorder
      : colors.defaultBorderColor};
  border-radius: 8px;
  background-color: ${(p) =>
    p.selected ? colors.selectorHoverBorder : 'transparent'};
  
  &:hover {
    background-color: ${(p) =>
    p.selected ? colors.selectorHoverBorder : colors.selectorHover};
  }
`;

const MetadataInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const ProofContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;

  > * {
    max-width: 100%;
  }
`;

const ProofTextArea = styled.textarea`
  width: 100%;
  flex: 1;
  min-height: 500px;
  margin-top: 10px;
  padding: 10px;
  border: 1px solid ${colors.defaultBorderColor};
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  resize: none;
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  box-sizing: border-box;
  background: rgba(0, 0, 0, 0.1);
  color: ${colors.white};
  
  scrollbar-width: thin;
  scrollbar-color: rgba(155, 155, 155, 0.5) transparent;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: rgba(155, 155, 155, 0.5);
    border-radius: 20px;
  }
`;

const ErrorMessage = styled.span`
  color: #FF3B30;
`;

const SpinnerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 10px;
  border-radius: 4px;
  box-sizing: border-box;
  background-color: rgba(0, 0, 0, 0.05);
  flex: 1;
`;

const SpinnerMessage = styled(ThemedText.LabelSmall)`
  margin-top: 15px;
  text-align: center;
  opacity: 0.8;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  color: ${colors.white};
  padding: 4px 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    opacity: 0.8;
  }
`;

const StyledChevronRight = styled(ChevronRight)`
  width: 16px;
  height: 16px;
  color: ${colors.white};
`;

const EmptyStateContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 550px;
  padding: 20px;
`;

const EmptyStateMessage = styled(ThemedText.BodySmall)`
  text-align: center;
  opacity: 0.6;
`;

const AdvancedSection = styled.div`
  border: 1px solid ${colors.defaultBorderColor};
  border-radius: 8px;
  overflow: hidden;
`;

const AdvancedHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.05);
  
  &:hover {
    background: rgba(0, 0, 0, 0.1);
  }
`;

const AdvancedContent = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  border-top: 1px solid ${colors.defaultBorderColor};
`;

const BalanceSection = styled.div`
  border: 1px solid ${colors.defaultBorderColor};
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.02);
`;

const BalanceHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid ${colors.defaultBorderColor};
`;

const BalanceInfo = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const BalanceItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BalanceLabel = styled(ThemedText.BodySmall)`
  font-weight: 500;
  opacity: 0.8;
`;

const BalanceValue = styled(ThemedText.BodySmall)`
  font-family: monospace;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RefreshButton = styled.button`
  background: none;
  border: none;
  color: ${colors.white};
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const StatusIndicator = styled.span<{ connected: boolean }>`
  color: ${props => props.connected ? '#4CAF50' : '#F44336'};
  font-weight: 500;
`;

const ErrorText = styled.span`
  color: #FF3B30;
  font-size: 12px;
`;

export { Home };