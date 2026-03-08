export interface ApiResponse<T> {
  status: boolean;
  message: string | null;
  data: T | null;
  errors: any | null;
}



export class PagedResult<T> {
  totalRecords: number;
  page: number;
  pageSize: number;
  data: T[];

  constructor(totalRecords: number, page: number, pageSize: number, data: T[]) {
    this.totalRecords = totalRecords;
    this.page = page;
    this.pageSize = pageSize;
    this.data = data;
  }

  get totalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  get hasNextPage(): boolean {
    return this.page < this.totalPages;
  }

  get hasPrevPage(): boolean {
    return this.page > 1;
  }
}
