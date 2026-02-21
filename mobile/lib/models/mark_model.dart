class MarkModel {
  final String id;
  final String studentId;
  final String? studentName;
  final String subject;
  final double marks;
  final double maxMarks;
  final DateTime examDate;
  final String? term;

  MarkModel({
    required this.id,
    required this.studentId,
    this.studentName,
    required this.subject,
    required this.marks,
    this.maxMarks = 100,
    required this.examDate,
    this.term,
  });

  double get percentage => maxMarks > 0 ? (marks / maxMarks * 100) : 0;

  factory MarkModel.fromJson(Map<String, dynamic> json) {
    final student = json['studentId'];
    return MarkModel(
      id: json['_id'] ?? '',
      studentId: student is String ? student : (student?['_id'] ?? ''),
      studentName: student is Map ? student['name'] : null,
      subject: json['subject'] ?? '',
      marks: (json['marks'] ?? 0).toDouble(),
      maxMarks: (json['maxMarks'] ?? 100).toDouble(),
      examDate: json['examDate'] != null
          ? DateTime.parse(json['examDate'].toString())
          : DateTime.now(),
      term: json['term'],
    );
  }

  Map<String, dynamic> toJson() => {
        'studentId': studentId,
        'subject': subject,
        'marks': marks,
        'maxMarks': maxMarks,
        'examDate': examDate.toIso8601String(),
        'term': term,
      };
}
