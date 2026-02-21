import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'dart:io';
import '../providers/auth_provider.dart';
import '../config/api_config.dart';
import '../models/invoice_model.dart';
import 'invoice_pay_screen.dart';

class PendingFeesScreen extends StatefulWidget {
  const PendingFeesScreen({super.key});

  @override
  State<PendingFeesScreen> createState() => _PendingFeesScreenState();
}

class _PendingFeesScreenState extends State<PendingFeesScreen> {
  List<InvoiceModel> _list = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _downloadPdf(InvoiceModel inv) async {
    final token = context.read<AuthProvider>().token;
    if (token == null) return;
    try {
      final url = Uri.parse('${ApiConfig.serverOrigin}/api/reports/invoice-pdf/${inv.id}');
      final res = await http.get(url, headers: {'Authorization': 'Bearer $token'});
      if (res.statusCode != 200) throw Exception('Download failed');
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/invoice-${inv.invoiceNumber ?? inv.id}.pdf');
      await file.writeAsBytes(res.bodyBytes);
      await OpenFilex.open(file.path);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Opened PDF')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final list = await context.read<AuthProvider>().api.getInvoices(status: 'pending');
      final partial = await context.read<AuthProvider>().api.getInvoices(status: 'partial');
      if (mounted) setState(() {
        _list = [...list, ...partial]..sort((a, b) => b.date.compareTo(a.date));
        _loading = false;
      });
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
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
    if (_list.isEmpty) {
      return const Center(child: Text('No pending fees'));
    }
    final fmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _list.length,
        itemBuilder: (_, i) {
          final inv = _list[i];
          final pending = inv.amount - inv.paidAmount;
          if (pending <= 0) return const SizedBox.shrink();
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              title: Text(inv.studentName ?? 'Student'),
              subtitle: Text('${inv.invoiceNumber ?? inv.id}\n${DateFormat.yMMMd().format(inv.date)} • Pending: ${fmt.format(pending)}'),
              trailing: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(icon: const Icon(Icons.picture_as_pdf), onPressed: () => _downloadPdf(inv), tooltip: 'Download PDF'),
                  FilledButton(
                    onPressed: () async {
                      await Navigator.push(context, MaterialPageRoute(builder: (_) => InvoicePayScreen(invoice: inv)));
                      _load();
                    },
                    child: const Text('Pay'),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
