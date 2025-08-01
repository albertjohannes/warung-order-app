import HeaderWithSettings from '@/components/HeaderWithSettings';
import { useLanguage } from '@/contexts/LanguageContext';
import { Transaction } from '@/data/mockData';
import { getTransactions, saveTransaction } from '@/services/storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function HistoryTabScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  // Reload transactions when screen comes into focus (e.g., when navigating back from order detail)
  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, [])
  );

  const loadTransactions = async () => {
    try {
      const storedTransactions = await getTransactions();
      setTransactions(storedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionTap = (transaction: Transaction) => {
    // Navigate to order detail page
    router.push(`/order-detail?transactionId=${transaction.transaction_id}`);
  };

  const handleReceiptConfirm = async (transaction: Transaction) => {
    if (transaction.has_good_receipt) {
      return; // Already confirmed
    }

    Alert.alert(
      t('confirmReceipt'),
      t('confirmReceiptMessage', { transactionId: transaction.transaction_id }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
                      onPress: async () => {
              try {
                // Simulate API delay
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Mock receipt confirmation
                const updatedTransaction: Transaction = {
                ...transaction,
                has_good_receipt: true,
                good_receipt_total: transaction.total,
              };
              
              // Save updated transaction
              await saveTransaction(updatedTransaction);
              
              // Reload transactions
              await loadTransactions();
              
              Alert.alert(t('confirmReceipt'), t('receiptConfirmed'));
            } catch (error) {
              console.error('Error confirming transaction:', error);
              Alert.alert(t('error'), t('receiptConfirmError'));
            }
          }
        }
      ]
    );
  };

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    // Use local date string to avoid timezone issues
    const date = new Date(transaction.date).toLocaleDateString('en-CA'); // YYYY-MM-DD format
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => 
    new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()
  );

  const formatPrice = (price: number) => {
    return `Rp ${price.toLocaleString('id-ID')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity 
      style={[
        styles.transactionCard,
        !item.has_good_receipt && styles.pendingTransaction
      ]}
      onPress={() => handleTransactionTap(item)}
      activeOpacity={0.8}
    >
      <View style={styles.transactionHeader}>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionTime}>{formatDate(item.date)}</Text>
          <Text style={styles.transactionId} numberOfLines={1}>
            {item.transaction_id}
          </Text>
          {item.has_good_receipt ? (
            <Text style={styles.receiptComplete}>{t('receiptComplete')}</Text>
          ) : (
            <TouchableOpacity 
              onPress={() => handleReceiptConfirm(item)}
              style={styles.receiptPendingButton}
            >
              <Text style={styles.receiptPending}>{t('receiptPending')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {/* Loan ID positioned at top right */}
      {item.loan_id && (
        <View style={styles.loanIdContainer}>
          <View style={styles.loanIdBanner}>
            <Text style={styles.loanIdText}>#{item.loan_id}</Text>
          </View>
        </View>
      )}
      
      {/* Total amount positioned below loan ID */}
      <View style={styles.transactionAmountContainer}>
        <Text style={styles.transactionTotal}>{formatPrice(item.total)}</Text>
      </View>
      
      <View style={styles.itemsList}>
        {item.items.map((cartItem, index) => (
          <View key={index} style={styles.itemRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {cartItem.name} x{cartItem.quantity}
            </Text>
            <Text style={styles.itemPrice}>
              {formatPrice(cartItem.price * cartItem.quantity)}
            </Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  const renderDateSection = ({ item }: { item: string }) => (
    <View style={styles.dateSection}>
      <Text style={styles.dateHeader}>{formatDate(item)}</Text>
      {groupedTransactions[item].map((transaction, index) => (
        <View key={transaction.transaction_id} style={styles.transactionWrapper}>
          {renderTransaction({ item: transaction })}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderWithSettings title={t('history')} />
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={sortedDates}
          renderItem={renderDateSection}
          keyExtractor={(item) => item}
          style={styles.transactionsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyHistory}>
              <Text style={styles.emptyHistoryText}>{t('noTransactions')}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  transactionsList: {
    flex: 1,
    padding: 16,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  transactionWrapper: {
    marginBottom: 8,
  },
  transactionCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 12,
  },
  transactionTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  transactionIds: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transactionId: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
  loanIdContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  transactionAmountContainer: {
    position: 'absolute',
    top: 60,
    right: 16,
    alignItems: 'flex-end',
  },
  loanIdBanner: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  loanIdText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },

  receiptComplete: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 4,
  },
  receiptPendingButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  receiptPending: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 4,
  },
  itemsList: {
    gap: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  emptyHistory: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyHistoryText: {
    fontSize: 18,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingTransaction: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
}); 