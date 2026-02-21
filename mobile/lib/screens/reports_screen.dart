import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'dart:io';
import '../providers/auth_provider.dart';
import '../config/api_config.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  Map<String, dynamic>? _revenue;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await context.read<AuthProvider>().api.getRevenuePerStudent();
      if (mounted) setState(() { _revenue = data; _loading = false; });
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _downloadPdf(String path) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;
    try {
      final url = Uri.parse('${ApiConfig.serverOrigin}$path');
      final res = await http.get(url, headers: {'Authorization': 'Bearer $token'});
      if (res.statusCode != 200) throw Exception('Download failed');
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/report.pdf');
      await file.writeAsBytes(res.bodyBytes);
      await OpenFilex.open(file.path);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _downloadExcel(String path) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;
    try {
      final url = Uri.parse('${ApiConfig.serverOrigin}$path');
      final res = await http.get(url, headers: {'Authorization': 'Bearer $token'});
      if (res.statusCode != 200) throw Exception('Download failed');
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/income-expense-report.xlsx');
      await file.writeAsBytes(res.bodyBytes);
      await OpenFilex.open(file.path);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_error!, style: TextStyle(color: Colors.red[700])),
            const SizedBox(height: 8),
            FilledButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Retry')),
          ],
        ),
      );
    }
    final fmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    final rev = _revenue!;
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Business metrics', style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 12),
                  Text('Total revenue: ${fmt.format(rev['totalRevenue'] ?? 0)}'),
                  Text('Active students: ${rev['activeStudentCount'] ?? 0}'),
                  Text('Revenue per student: ${fmt.format(rev['revenuePerStudent'] ?? 0)}'),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Export reports', style: TextStyle(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          ListTile(
            leading: const Icon(Icons.picture_as_pdf),
            title: const Text('Invoice PDF'),
            subtitle: const Text('Generate from Pending Fees → open invoice → download'),
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Open an invoice from Pending Fees and use Download PDF'))),
          ),
          ListTile(
            leading: const Icon(Icons.table_chart),
            title: const Text('Income & Expense (Excel)'),
            subtitle: const Text('Download income and expense report'),
            onTap: () => _downloadExcel('/api/reports/income-expense-excel'),
          ),
          ListTile(
            leading: const Icon(Icons.picture_as_pdf),
            title: const Text('Student marks PDF'),
            subtitle: const Text('Generate from Marks screen → select student → download'),
            onTap: () => ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Select student in Marks screen to download marks PDF'))),
          ),
        ],
      ),
    );
  }
}
