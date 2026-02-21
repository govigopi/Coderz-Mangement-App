import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import 'dashboard_screen.dart';
import 'students_screen.dart';
import 'pending_fees_screen.dart';
import 'income_expense_screen.dart';
import 'reports_screen.dart';
import 'courses_screen.dart';
import 'marks_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _index = 0;

  static const _tabs = [
    ('Dashboard', Icons.dashboard_rounded),
    ('Students', Icons.people_rounded),
    ('Pending Fees', Icons.pending_actions_rounded),
    ('Income & Expense', Icons.account_balance_wallet_rounded),
    ('Marks', Icons.assignment_rounded),
    ('Reports', Icons.analytics_rounded),
    ('Courses', Icons.menu_book_rounded),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_tabs[_index].$1),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () async {
              final ok = await showDialog<bool>(
                context: context,
                builder: (c) => AlertDialog(
                  title: const Text('Logout'),
                  content: const Text('Are you sure you want to logout?'),
                  actions: [
                    TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
                    FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Logout')),
                  ],
                ),
              );
              if (ok == true && context.mounted) context.read<AuthProvider>().logout();
            },
          ),
        ],
      ),
      body: IndexedStack(
        index: _index,
        children: const [
          DashboardScreen(),
          StudentsScreen(),
          PendingFeesScreen(),
          IncomeExpenseScreen(),
          MarksScreen(),
          ReportsScreen(),
          CoursesScreen(),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: _tabs.map((t) => NavigationDestination(icon: Icon(t.$2), label: t.$1)).toList(),
      ),
    );
  }
}
