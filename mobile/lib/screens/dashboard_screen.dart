import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _data;
  List<dynamic>? _monthlyIncome;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<AuthProvider>().api;
      final dash = await api.getDashboard();
      final monthly = await api.getMonthlyIncome();
      if (mounted) setState(() {
        _data = dash;
        _monthlyIncome = monthly;
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
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: Colors.red[700])),
            const SizedBox(height: 16),
            FilledButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Retry')),
          ],
        ),
      );
    }
    final d = _data!;
    final fmt = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.4,
              children: [
                _Card(title: 'Total Students', value: '${d['totalStudents'] ?? 0}', icon: Icons.people),
                _Card(title: 'Active Students', value: '${d['activeStudents'] ?? 0}', icon: Icons.person),
                _Card(title: 'Monthly Income', value: fmt.format(d['monthlyIncome'] ?? 0), icon: Icons.arrow_downward, color: Colors.green),
                _Card(title: 'Monthly Expense', value: fmt.format(d['monthlyExpense'] ?? 0), icon: Icons.arrow_upward, color: Colors.orange),
                _Card(title: 'Pending Fees', value: fmt.format(d['totalPendingFees'] ?? 0), icon: Icons.pending, color: Colors.amber),
                _Card(title: 'Today Income', value: fmt.format(d['todayIncome'] ?? 0), icon: Icons.today, color: Colors.teal),
              ],
            ),
            const SizedBox(height: 24),
            Text('Monthly Income (Last 12 months)', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            if (_monthlyIncome != null && _monthlyIncome!.isNotEmpty)
              SizedBox(
                height: 200,
                child: BarChart(
                  BarChartData(
                    alignment: BarChartAlignment.spaceAround,
                    maxY: (_monthlyIncome!.fold<double>(0, (a, e) {
                      final t = (e as Map)['total'];
                      return t > a ? (t is int ? t.toDouble() : (t as num).toDouble()) : a;
                    }) * 1.2).clamp(10, double.infinity),
                    barTouchData: BarTouchData(enabled: false),
                    titlesData: FlTitlesData(
                      leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 32, getTitlesWidget: (v, _) => Text('₹${v.toInt()}'))),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          getTitlesWidget: (v, _) {
                            final i = v.toInt();
                            if (i >= 0 && i < _monthlyIncome!.length) {
                              final m = _monthlyIncome![i] as Map;
                              return Text('${m['_id']?['month'] ?? ''}');
                            }
                            return const Text('');
                          },
                        ),
                      ),
                      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    ),
                    gridData: const FlGridData(show: true),
                    barGroups: List.generate(_monthlyIncome!.length, (i) {
                      final t = _monthlyIncome![i]['total'];
                      final val = t is int ? t.toDouble() : (t as num).toDouble();
                      return BarChartGroupData(
                        x: i,
                        barRods: [BarChartRodData(toY: val, color: Theme.of(context).colorScheme.primary, width: 16)],
                        showingTooltipIndicators: [],
                      );
                    }),
                  ),
                ),
              )
            else
              const Padding(padding: EdgeInsets.all(24), child: Center(child: Text('No data'))),
          ],
        ),
      ),
    );
  }
}

class _Card extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color? color;

  const _Card({required this.title, required this.value, required this.icon, this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? Theme.of(context).colorScheme.primary;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(children: [Icon(icon, size: 20, color: c), const SizedBox(width: 6), Expanded(child: Text(title, style: Theme.of(context).textTheme.labelLarge))]),
            const SizedBox(height: 8),
            Text(value, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
