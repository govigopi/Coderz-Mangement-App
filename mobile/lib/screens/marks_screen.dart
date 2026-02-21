import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import 'dart:io';
import '../providers/auth_provider.dart';
import '../config/api_config.dart';
import '../models/student_model.dart';
import '../models/mark_model.dart';
import 'add_mark_screen.dart';

class MarksScreen extends StatefulWidget {
  const MarksScreen({super.key});

  @override
  State<MarksScreen> createState() => _MarksScreenState();
}

class _MarksScreenState extends State<MarksScreen> {
  List<StudentModel> _students = [];
  List<MarkModel> _marks = [];
  String? _selectedStudentId;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadStudents();
  }

  Future<void> _loadStudents() async {
    setState(() => _loading = true);
    try {
      final list = await context.read<AuthProvider>().api.getStudents();
      if (mounted) setState(() { _students = list; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _downloadMarksPdf() async {
    if (_selectedStudentId == null) return;
    final token = context.read<AuthProvider>().token;
    if (token == null) return;
    try {
      final url = Uri.parse('${ApiConfig.serverOrigin}/api/reports/marks-pdf/$_selectedStudentId');
      final res = await http.get(url, headers: {'Authorization': 'Bearer $token'});
      if (res.statusCode != 200) throw Exception('Download failed');
      final dir = await getTemporaryDirectory();
      final name = _students.firstWhere((s) => s.id == _selectedStudentId).name.replaceAll(' ', '-');
      final file = File('${dir.path}/marks-$name.pdf');
      await file.writeAsBytes(res.bodyBytes);
      await OpenFilex.open(file.path);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Opened PDF')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    }
  }

  Future<void> _loadMarks() async {
    if (_selectedStudentId == null) return;
    setState(() => _loading = true);
    try {
      final list = await context.read<AuthProvider>().api.getMarks(studentId: _selectedStudentId);
      if (mounted) setState(() { _marks = list; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _students.isEmpty) return const Center(child: CircularProgressIndicator());
    if (_error != null && _students.isEmpty) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [Text(_error!), FilledButton.icon(onPressed: _loadStudents, icon: const Icon(Icons.refresh), label: const Text('Retry'))]));
    }
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(8),
          child: Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  value: _selectedStudentId,
                  decoration: const InputDecoration(labelText: 'Select Student', border: OutlineInputBorder()),
                  items: _students.map((s) => DropdownMenuItem(value: s.id, child: Text(s.name))).toList(),
                  onChanged: (v) => setState(() { _selectedStudentId = v; _loadMarks(); }),
                ),
              ),
              if (_selectedStudentId != null)
                IconButton(icon: const Icon(Icons.picture_as_pdf), onPressed: _downloadMarksPdf, tooltip: 'Download PDF'),
            ],
          ),
        ),
        if (_selectedStudentId != null)
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    padding: const EdgeInsets.all(8),
                    itemCount: _marks.length,
                    itemBuilder: (_, i) {
                      final m = _marks[i];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 6),
                        child: ListTile(
                          title: Text('${m.subject} – ${m.marks.toStringAsFixed(0)} / ${m.maxMarks.toStringAsFixed(0)}'),
                          subtitle: Text('${m.percentage.toStringAsFixed(1)}% • ${DateFormat.yMMMd().format(m.examDate)} ${m.term != null ? "• ${m.term}" : ""}'),
                          trailing: IconButton(
                            icon: const Icon(Icons.delete_outline),
                            onPressed: () async {
                              final ok = await showDialog<bool>(context: context, builder: (c) => AlertDialog(title: const Text('Delete'), content: const Text('Remove this mark?'), actions: [TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')), FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Delete'))]));
                              if (ok == true) {
                                try {
                                  await context.read<AuthProvider>().api.deleteMark(m.id);
                                  _loadMarks();
                                } catch (_) {}
                              }
                            },
                          ),
                        ),
                      );
                    },
                  ),
          )
        else
          const Expanded(child: Center(child: Text('Select a student to view marks'))),
        Padding(
          padding: const EdgeInsets.all(8),
          child: FilledButton.icon(
            icon: const Icon(Icons.add),
            label: const Text('Add Marks'),
            onPressed: _selectedStudentId == null
                ? null
                : () async {
                    await Navigator.push(context, MaterialPageRoute(builder: (_) => AddMarkScreen(studentId: _selectedStudentId!, studentName: _students.firstWhere((s) => s.id == _selectedStudentId).name)));
                    _loadMarks();
                  },
            style: FilledButton.styleFrom(minimumSize: const Size(double.infinity, 48)),
          ),
        ),
      ],
    );
  }
}
