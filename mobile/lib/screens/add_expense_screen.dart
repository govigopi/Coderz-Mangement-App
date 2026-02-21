import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../models/expense_model.dart';

class AddExpenseScreen extends StatefulWidget {
  final ExpenseModel? expense;

  const AddExpenseScreen({super.key, this.expense});

  @override
  State<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends State<AddExpenseScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _amount, _description, _category;
  DateTime _date = DateTime.now();
  bool _loading = false;
  bool get _isEdit => widget.expense != null;

  @override
  void initState() {
    super.initState();
    final e = widget.expense;
    _amount = TextEditingController(text: e?.amount.toString() ?? '');
    _description = TextEditingController(text: e?.description ?? '');
    _category = TextEditingController(text: e?.category ?? '');
    _date = e?.date ?? DateTime.now();
  }

  @override
  void dispose() {
    _amount.dispose();
    _description.dispose();
    _category.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final amt = double.tryParse(_amount.text);
    if (amt == null || amt <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter valid amount')));
      return;
    }
    setState(() => _loading = true);
    try {
      final api = context.read<AuthProvider>().api;
      final model = ExpenseModel(id: widget.expense?.id ?? '', amount: amt, date: _date, category: _category.text.trim().isEmpty ? null : _category.text.trim(), description: _description.text.trim());
      if (_isEdit) await api.updateExpense(widget.expense!.id, model);
      else await api.createExpense(model);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(_isEdit ? 'Expense updated' : 'Expense added')));
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
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit Expense' : 'Add Expense')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(controller: _amount, decoration: const InputDecoration(labelText: 'Amount (₹) *', border: OutlineInputBorder()), keyboardType: TextInputType.number, validator: (v) => v?.trim().isEmpty ?? true ? 'Required' : null),
            const SizedBox(height: 12),
            TextFormField(controller: _description, decoration: const InputDecoration(labelText: 'Description *', border: OutlineInputBorder()), validator: (v) => v?.trim().isEmpty ?? true ? 'Required' : null),
            const SizedBox(height: 12),
            TextFormField(controller: _category, decoration: const InputDecoration(labelText: 'Category (e.g. Salaries, Rent)', border: OutlineInputBorder())),
            const SizedBox(height: 12),
            ListTile(
              title: const Text('Date'),
              subtitle: Text('${_date.year}-${_date.month.toString().padLeft(2, '0')}-${_date.day.toString().padLeft(2, '0')}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final d = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2020), lastDate: DateTime.now());
                if (d != null) setState(() => _date = d);
              },
            ),
            const SizedBox(height: 24),
            FilledButton(onPressed: _loading ? null : _save, style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)), child: _loading ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(strokeWidth: 2)) : Text(_isEdit ? 'Update' : 'Save')),
          ],
        ),
      ),
    );
  }
}
