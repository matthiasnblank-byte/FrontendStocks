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

import { TradeFormGroup, TradeFormValue, buildTradeFormGroup, parseTradeFormValue } from '../forms/trade.schema';
import { Symbol } from '../../../domain/models/symbol.brand';

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
    const parsed = parseTradeFormValue(raw);
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
