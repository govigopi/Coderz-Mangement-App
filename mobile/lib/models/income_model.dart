class IncomeModel {
  final String id;
  final double amount;
  final DateTime date;
  final String? source;
  final String? description;
  final String? studentName;

  IncomeModel({
    required this.id,
    required this.amount,
    required this.date,
    this.source,
    this.description,
    this.studentName,
  });

  factory IncomeModel.fromJson(Map<String, dynamic> json) {
    final student = json['studentId'];
    return IncomeModel(
      id: json['_id'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      date: json['date'] != null
          ? DateTime.parse(json['date'].toString())
          : DateTime.now(),
      source: json['source'],
      description: json['description'],
      studentName: student is Map ? student['name'] : null,
    );
  }
}
