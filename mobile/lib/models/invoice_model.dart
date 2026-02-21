class InvoiceModel {
  final String id;
  final String studentId;
  final String? studentName;
  final String? studentMobile;
  final double amount;
  final double paidAmount;
  final DateTime date;
  final DateTime? dueDate;
  final String status;
  final String? description;
  final String? invoiceNumber;

  InvoiceModel({
    required this.id,
    required this.studentId,
    this.studentName,
    this.studentMobile,
    required this.amount,
    this.paidAmount = 0,
    required this.date,
    this.dueDate,
    this.status = 'pending',
    this.description,
    this.invoiceNumber,
  });

  double get pending => amount - paidAmount;

  factory InvoiceModel.fromJson(Map<String, dynamic> json) {
    final student = json['studentId'];
    return InvoiceModel(
      id: json['_id'] ?? '',
      studentId: student is String ? student : (student?['_id'] ?? ''),
      studentName: student is Map ? student['name'] : null,
      studentMobile: student is Map ? student['mobile'] : null,
      amount: (json['amount'] ?? 0).toDouble(),
      paidAmount: (json['paidAmount'] ?? 0).toDouble(),
      date: json['date'] != null
          ? DateTime.parse(json['date'].toString())
          : DateTime.now(),
      dueDate: json['dueDate'] != null
          ? DateTime.parse(json['dueDate'].toString())
          : null,
      status: json['status'] ?? 'pending',
      description: json['description'],
      invoiceNumber: json['invoiceNumber'],
    );
  }
}
