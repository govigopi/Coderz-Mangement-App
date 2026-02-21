import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/invoice_model.dart';

class InvoicePayScreen extends StatefulWidget {
  final InvoiceModel invoice;

  const InvoicePayScreen({super.key, required this.invoice});

  @override
  State<InvoicePayScreen> createState() => _InvoicePayScreenState();
}

class _InvoicePayScreenState extends State<InvoicePayScreen> {
  final _amountController = TextEditingController();
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    _amountController.text = widget.invoice.pending.toStringAsFixed(0);
  }

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    final amount = double.tryParse(_amountController.text);
    if (amount == null || amount <= 0 || amount > widget.invoice.pending) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter valid amount')));
      return;
    }
    setState(() => _loading = true);
    try {
      await context.read<AuthProvider>().api.payInvoice(widget.invoice.id, amount);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Payment recorded')));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final inv = widget.invoice;
    return Scaffold(
      appBar: AppBar(title: Text('Pay: ${inv.invoiceNumber ?? inv.id}')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Student: ${inv.studentName ?? "N/A"}', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text('Total: ₹${inv.amount.toStringAsFixed(0)} • Paid: ₹${inv.paidAmount.toStringAsFixed(0)} • Pending: ₹${inv.pending.toStringAsFixed(0)}'),
            const SizedBox(height: 24),
            TextField(
              controller: _amountController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Amount to pay (₹)', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _loading ? null : _pay,
              style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
              child: _loading ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Record Payment'),
            ),
          ],
        ),
      ),
    );
  }
}
