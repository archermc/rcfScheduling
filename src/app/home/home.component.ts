import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import {animate, state, style, transition, trigger} from '@angular/animations';
import {MatDatepickerInputEvent} from '@angular/material/datepicker';
import {TimeOfDay, timeSlots, TimeLengthOption} from './day.model';
import { MatTableDataSource } from '@angular/material/table';
import { CalendarService } from './calendar.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { v4 as uuidv4 } from 'uuid';
import { formatDate } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({height: '0px', minHeight: '0'})),
      state('expanded', style({height: '*'})),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
})
export class HomeComponent implements OnInit {

  dataSource: MatTableDataSource<TimeOfDay> = new MatTableDataSource<TimeOfDay>();
  displayedColumns = ['formattedDisplay', 'slotsOpen'];
  timeOptions = [
    {id: 0, label: '60 Minutes'},
    {id: 1, label: '90 Minutes'}
  ];
  // The slots currently taken by already signed up users
  takenTimeSlots: TimeOfDay[] = [];
  availableSlots: TimeOfDay[] = [];
  selectedTimeLength: TimeLengthOption = TimeLengthOption.SIXTY;
  newSlotFormGroup: FormGroup;
  selectedTime: number = 0;
  selectedDate: string = '';

  constructor(
    private changeDetectorRefs: ChangeDetectorRef,
    private calendarService: CalendarService,
    private fb: FormBuilder
  ) { }

  async ngOnInit() {
    this.newSlotFormGroup = this.fb.group({
      name: [''],
      email: [''],
    });
    this.initializeTable();
    const res: TimeOfDay[] = await this.calendarService.getCalendar('05-20-2020');
    if (res && res.length > 0) {
      this.takenTimeSlots = res;
      this.updateTimeSlots();
    }
  }

  // Renders the table data based on the time length option chosen by user
  initializeTable(): void {
    //Format time
    let endTimeOption = 1;
    if (this.selectedTimeLength === TimeLengthOption.NINETY) {
      endTimeOption = 1.5;
    }
    this.availableSlots = timeSlots.map(slot => {
      slot.formattedDisplay = `${this.findTime(slot.beginningTime)} - ${this.findTime(slot.beginningTime + endTimeOption)}`;
      return slot;
    });
    this.dataSource.data = this.availableSlots;
    this.changeDetectorRefs.detectChanges();
  }

  timeSlotSelected(row: TimeOfDay) {
    this.selectedTime = row.beginningTime;
  }

  highlightSelectedRow(row: TimeOfDay): boolean {
    return row.beginningTime === this.selectedTime;
  }

  submitSlot(): void {
    const newSlot: TimeOfDay = {
      id: uuidv4(),
      currentDay: this.selectedDate,
      beginningTime: this.selectedTime,
      lengthOfTime: this.selectedTimeLength
    };
    this.calendarService.newPosting(newSlot);
  }

  remapTableData(): void {
    //Format time
    this.dataSource.data = this.availableSlots;
    this.changeDetectorRefs.detectChanges();
  }

  newSelection(event: any): void {
    if (event.value === 1) {
      this.selectedTimeLength = TimeLengthOption.NINETY;
    } else {
      this.selectedTimeLength = TimeLengthOption.SIXTY;
    }
    this.initializeTable();
  }

  addEvent(type: string, event: MatDatepickerInputEvent<Date>) {
    this.selectedDate = formatDate(event.value, 'MM-dd-yyyy', 'en-us');
  }

  updateTimeSlots(): void {
    this.takenTimeSlots.forEach( takenSlot => {
      let endTime = takenSlot.lengthOfTime === TimeLengthOption.SIXTY ? takenSlot.beginningTime + 1 : takenSlot.beginningTime + 1.5;
      this.availableSlots = this.availableSlots.map( availableSlot => {
        let availableSlotEndTime = this.selectedTimeLength === TimeLengthOption.SIXTY ? availableSlot.beginningTime + 1 : availableSlot.beginningTime + 1.5;
        if (availableSlot.slotsOpen && (availableSlot.beginningTime >= takenSlot.beginningTime && availableSlot.beginningTime < endTime) || (availableSlotEndTime > takenSlot.beginningTime && availableSlotEndTime <= endTime)) {
          availableSlot.slotsOpen--;
        }
        return availableSlot;
      });
    });
    this.remapTableData();
  }

  findTime(numericFormat: number): string {
    let meridiem = 'am';
    let numberToBeFormatted = numericFormat;
    let minutes = ':00';
    if (numberToBeFormatted > 12) {
      meridiem = 'pm';
      numberToBeFormatted -= 12;
    }
    let decimal = numberToBeFormatted % 1;
    if (decimal) {
      minutes = ':30';
      numberToBeFormatted -= .5;
    }
    return `${numberToBeFormatted}${minutes} ${meridiem}`;
  }
}
