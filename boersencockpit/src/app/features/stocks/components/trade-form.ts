import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { ReactiveFormsModule, NonNullableFormBuilder } from '@angular/forms';

import {
  TradeFormGroup,
  TradeFormRawValue,
  TradeFormValue,
  buildTradeFormGroup,
  parseTradeFormValue,
} from '../forms/trade.schema';
import { Symbol } from '../../../domain/models/symbol.brand';

const toLocalDateTimeInput = (iso: string): string => {
  const date = new Date(iso);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const toIsoString = (value: string): string => {
  if (!value) {
    return new Date().toISOString();
  }
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(value);
  if (hasTimezone) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

@Component({
  selector: 'app-trade-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './trade-form.html',
  styleUrl: './trade-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradeFormComponent implements OnChanges {
  private readonly formBuilder = inject(NonNullableFormBuilder);

  @Input() symbol: Symbol | null = null;
  @Input() submitting = false;
  @Input() heading = 'Trade hinzufügen';

  @Output() readonly submitted = new EventEmitter<TradeFormValue>();

  protected readonly form: TradeFormGroup = buildTradeFormGroup(this.formBuilder);

  constructor() {
    const current = this.form.controls.timestamp.value;
    this.form.controls.timestamp.setValue(toLocalDateTimeInput(current));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['symbol']) {
      const value = changes['symbol'].currentValue as Symbol | null;
      if (value) {
        this.form.controls.symbol.setValue(String(value));
        this.form.controls.symbol.disable({ emitEvent: false });
      } else {
        this.form.controls.symbol.enable({ emitEvent: false });
      }
    }
  }

  protected onSymbolInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const upper = target.value.toUpperCase();
    this.form.controls.symbol.setValue(upper);
  }

  protected onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const raw = this.form.getRawValue();
    const normalized: TradeFormRawValue = {
      ...raw,
      timestamp: toIsoString(raw.timestamp),
    };
    const parsed = parseTradeFormValue(normalized);
    this.submitted.emit(parsed);
  }

  protected controlHasError(controlName: keyof TradeFormGroup['controls']): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  protected get formErrorMessages(): readonly string[] {
    const groupErrors = this.form.errors?.['zod'] as { message: string }[] | undefined;
    return groupErrors?.map((error) => error.message) ?? [];
  }
}
