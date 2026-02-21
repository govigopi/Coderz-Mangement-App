import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../models/student_model.dart';
import '../models/course_model.dart';
import 'add_student_screen.dart';

class StudentsScreen extends StatefulWidget {
  const StudentsScreen({super.key});

  @override
  State<StudentsScreen> createState() => _StudentsScreenState();
}

class _StudentsScreenState extends State<StudentsScreen> {
  List<StudentModel> _list = [];
  bool _loading = true;
  String? _error;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final list = await context.read<AuthProvider>().api.getStudents(search: _search.isEmpty ? null : _search);
      if (mounted) setState(() { _list = list; _loading = false; });
    } catch (e) {
      if (mounted) setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _delete(StudentModel s) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Delete Student'),
        content: Text('Delete "${s.name}"? This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(c, true), style: FilledButton.styleFrom(backgroundColor: Colors.red), child: const Text('Delete')),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await context.read<AuthProvider>().api.deleteStudent(s.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Student deleted')));
        _load();
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(8),
          child: TextField(
            decoration: const InputDecoration(
              hintText: 'Search by name, mobile, email',
              prefixIcon: Icon(Icons.search),
              border: OutlineInputBorder(),
              isDense: true,
            ),
            onChanged: (v) => setState(() => _search = v),
            onSubmitted: (_) => _load(),
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                      Text(_error!, style: TextStyle(color: Colors.red[700])),
                      const SizedBox(height: 8),
                      FilledButton.icon(onPressed: _load, icon: const Icon(Icons.refresh), label: const Text('Retry')),
                    ]))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        itemCount: _list.length,
                        itemBuilder: (_, i) {
                          final s = _list[i];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              title: Text(s.name),
                              subtitle: Text('${s.mobile}\n${DateFormat.yMMMd().format(s.admissionDate)} • ${s.courses.map((c) => c.name).join(', ')}'),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text('₹${s.pendingAmount.toInt()}', style: TextStyle(color: s.pendingAmount > 0 ? Colors.orange[700] : null)),
                                  IconButton(icon: const Icon(Icons.edit), onPressed: () async {
                                    await Navigator.push(context, MaterialPageRoute(builder: (_) => AddStudentScreen(student: s)));
                                    _load();
                                  }),
                                  IconButton(icon: const Icon(Icons.delete_outline), onPressed: () => _delete(s)),
                                ],
                              ),
                              onTap: () async {
                                await Navigator.push(context, MaterialPageRoute(builder: (_) => AddStudentScreen(student: s)));
                                _load();
                              },
                            ),
                          );
                        },
                      ),
                    ),
        ),
        Padding(
          padding: const EdgeInsets.all(8),
          child: FilledButton.icon(
            icon: const Icon(Icons.add),
            label: const Text('Add Student'),
            onPressed: () async {
              await Navigator.push(context, MaterialPageRoute(builder: (_) => const AddStudentScreen()));
              _load();
            },
            style: FilledButton.styleFrom(minimumSize: const Size(double.infinity, 48)),
          ),
        ),
      ],
    );
  }
}
