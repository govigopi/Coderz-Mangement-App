import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../models/expense_model.dart';
import '../models/income_model.dart';
import 'add_expense_screen.dart';
import 'add_income_screen.dart';

class IncomeExpenseScreen extends StatefulWidget {
  const IncomeExpenseScreen({super.key});

  @override
  State<IncomeExpenseScreen> createState() => _IncomeExpenseScreenState();
}

class _IncomeExpenseScreenState extends State<IncomeExpenseScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<IncomeModel> _income = [];
  List<ExpenseModel> _expense = [];
  bool _loading = true;
  DateTime? _start;
  DateTime? _end;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final api = context.read<AuthProvider>().api;
      final income = await api.getIncome(startDate: _start, endDate: _end);
      final expense = await api.getExpenses(startDate: _start, endDate: _end);
      if (mounted) setState(() {
        _income = income;
        _expense = expense;
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() => _loading = false);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final range = await showDateRangePicker(
      context: context,
      firstDate: DateTime(2020),
      lastDate: now,
      initialDateRange: DateTimeRange(start: _start ?? DateTime(now.year, now.month, 1), end: _end ?? now),
    );
    if (range != null) setState(() { _start = range.start; _end = range.end; _load(); });
  }

  @override
  Widget build(BuildContext context) {
    final fmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return Column(
      children: [
        Material(
          color: Theme.of(context).colorScheme.surface,
          child: TabBar(
            controller: _tabController,
            tabs: const [Tab(text: 'Income'), Tab(text: 'Expense')],
          ),
        ),
        if (_start != null || _end != null)
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                Text(DateFormat.yMMMd().format(_start ?? DateTime.now()), style: Theme.of(context).textTheme.bodySmall),
                const Text(' – '),
                Text(DateFormat.yMMMd().format(_end ?? DateTime.now()), style: Theme.of(context).textTheme.bodySmall),
                TextButton(onPressed: _pickRange, child: const Text('Change')),
              ],
            ),
          )
        else
          Padding(
            padding: const EdgeInsets.all(8),
            child: TextButton.icon(onPressed: _pickRange, icon: const Icon(Icons.date_range), label: const Text('Filter by date range')),
          ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      padding: const EdgeInsets.all(8),
                      itemCount: _income.length,
                      itemBuilder: (_, i) {
                        final x = _income[i];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 6),
                          child: ListTile(
                            title: Text(fmt.format(x.amount), style: TextStyle(color: Colors.green[700], fontWeight: FontWeight.w600)),
                            subtitle: Text('${DateFormat.yMMMd().format(x.date)} • ${x.description ?? x.source ?? ""}'),
                          ),
                        );
                      },
                    ),
              _loading
                  ? const Center(child: CircularProgressIndicator())
                  : ListView.builder(
                      padding: const EdgeInsets.all(8),
                      itemCount: _expense.length,
                      itemBuilder: (_, i) {
                        final x = _expense[i];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 6),
                          child: ListTile(
                            title: Text(fmt.format(x.amount), style: TextStyle(color: Colors.orange[700], fontWeight: FontWeight.w600)),
                            subtitle: Text('${DateFormat.yMMMd().format(x.date)} • ${x.description}'),
                            trailing: IconButton(
                              icon: const Icon(Icons.edit),
                              onPressed: () async {
                                await Navigator.push(context, MaterialPageRoute(builder: (_) => AddExpenseScreen(expense: x)));
                                _load();
                              },
                            ),
                          ),
                        );
                      },
                    ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.add),
                  label: const Text('Add Income'),
                  onPressed: () async {
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddIncomeScreen()));
                    _load();
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: FilledButton.icon(
                  icon: const Icon(Icons.add),
                  label: const Text('Add Expense'),
                  onPressed: () async {
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddExpenseScreen()));
                    _load();
                  },
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
